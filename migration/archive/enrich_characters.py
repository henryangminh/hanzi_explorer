"""
One-time script to:
1. Drop hsk_level column, add classifiers + components columns to characters
2. For each unique char in hanzi_decomposition:
   - Crawl hvdic.thivien.net for stroke_count, radical, frequency
   - Use hanzipy to get components (once + radical, filtered & deduped)
   - Update characters table
"""

import sqlite3
import requests
import time
import json
import re
import sys
import logging
from bs4 import BeautifulSoup
from hanzipy.decomposer import HanziDecomposer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

DB_PATH = "/Users/henryangminh/Projects/hanzi_explorer/backend/data/hanzi.db"
BASE_URL = "https://hvdic.thivien.net/wpy/{}"
REQUEST_DELAY = 0.3  # seconds between requests

FREQUENCY_MAP = {
    "rất thấp": "very_low",
    "thấp": "low",
    "trung bình": "average",
    "cao": "high",
    "rất cao": "very_high",
}


def is_valid_component(char: str) -> bool:
    """Keep only single CJK characters (including radical supplement range)."""
    if len(char) != 1:
        return False
    cp = ord(char)
    return (
        0x2E80 <= cp <= 0x9FFF       # CJK Radicals Supplement → CJK Unified Ideographs
        or 0xF900 <= cp <= 0xFAFF    # CJK Compatibility Ideographs
        or 0x20000 <= cp <= 0x2FA1F  # CJK Extensions B-F
    )


def get_components(decomposer: HanziDecomposer, char: str) -> list[str]:
    """Return deduped list of valid CJK components (once first, then radical)."""
    try:
        result = decomposer.decompose(char)
    except Exception:
        return []

    once = result.get("once") or []
    radical = result.get("radical") or []

    seen = []
    for c in once + radical:
        if isinstance(c, str) and is_valid_component(c) and c not in seen:
            seen.append(c)
    return seen


def fetch_hvdic(session: requests.Session, char: str) -> dict:
    """
    Fetch and parse hvdic page for a character.
    Returns dict with keys: stroke_count, radical, frequency (all may be None).
    """
    result = {"stroke_count": None, "radical": None, "frequency": None}
    url = BASE_URL.format(char)
    try:
        resp = session.get(url, timeout=10)
        if resp.status_code != 200:
            return result
    except requests.RequestException as e:
        log.warning(f"Request failed for {char}: {e}")
        return result

    soup = BeautifulSoup(resp.text, "html.parser")
    text = soup.get_text(" ")

    # Stroke count
    m = re.search(r"Tổng nét:\s*(\d+)", text)
    if m:
        result["stroke_count"] = int(m.group(1))

    # Radical: "Bộ: pinyin HANZI (+N nét)"
    m = re.search(
        r"Bộ:.*?([\u2E80-\u9FFF\uF900-\uFAFF]+)\s*\(\+(\d+)\s*nét\)", text
    )
    if m:
        radical_char = m.group(1)
        extra_strokes = m.group(2)
        result["radical"] = f"{radical_char}/{extra_strokes}"

    # Frequency in modern Chinese (not classical)
    m = re.search(
        r"Độ thông dụng trong tiếng Trung hiện đại:\s*([\w\s]+?)(?=Độ|Âm|Lục|Nét|\Z)",
        text,
    )
    if m:
        raw = m.group(1).strip()
        result["frequency"] = FREQUENCY_MAP.get(raw, raw)

    return result


def migrate_schema(conn: sqlite3.Connection):
    cur = conn.cursor()

    # Check existing columns
    cur.execute("PRAGMA table_info(characters)")
    cols = {row[1] for row in cur.fetchall()}

    if "hsk_level" in cols:
        log.info("Dropping hsk_level column...")
        # SQLite doesn't support DROP COLUMN directly before 3.35 — use recreate approach
        sqlite_version = sqlite3.sqlite_version_info
        if sqlite_version >= (3, 35, 0):
            cur.execute("DROP INDEX IF EXISTS ix_char_hsk")
            cur.execute("ALTER TABLE characters DROP COLUMN hsk_level")
        else:
            log.warning(
                f"SQLite {sqlite3.sqlite_version} < 3.35 — cannot drop column directly. "
                "Skipping hsk_level drop. Please upgrade SQLite."
            )

    if "classifiers" not in cols:
        log.info("Adding classifiers column...")
        cur.execute("ALTER TABLE characters ADD COLUMN classifiers TEXT")

    if "components" not in cols:
        log.info("Adding components column...")
        cur.execute("ALTER TABLE characters ADD COLUMN components TEXT")

    conn.commit()
    log.info("Schema migration done.")


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    migrate_schema(conn)

    # Load unique characters from hanzi_decomposition
    chars = [
        row[0]
        for row in conn.execute(
            "SELECT DISTINCT character FROM hanzi_decomposition ORDER BY character"
        )
    ]
    log.info(f"Total unique chars in hanzi_decomposition: {len(chars)}")

    # Build a set of simplified chars already in characters table
    existing = {
        row[0]
        for row in conn.execute("SELECT simplified FROM characters")
    }

    decomposer = HanziDecomposer()
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (compatible; hanzi-explorer-crawler/1.0)"})

    processed = 0
    skipped = 0
    errors = 0

    for i, char in enumerate(chars):
        if char not in existing:
            skipped += 1
            continue

        # Check if already fully enriched (resume support)
        row = conn.execute(
            "SELECT stroke_count, components FROM characters WHERE simplified = ?",
            (char,),
        ).fetchone()
        if row and row["stroke_count"] is not None and row["components"] is not None:
            skipped += 1
            continue

        # --- crawl hvdic ---
        hvdic = fetch_hvdic(session, char)
        time.sleep(REQUEST_DELAY)

        # --- hanzipy decomposition ---
        components = get_components(decomposer, char)
        components_json = json.dumps(components, ensure_ascii=False) if components else None

        # --- update characters table ---
        conn.execute(
            """UPDATE characters
               SET stroke_count = COALESCE(?, stroke_count),
                   radical      = COALESCE(?, radical),
                   frequency    = COALESCE(?, frequency),
                   components   = COALESCE(?, components)
               WHERE simplified = ?""",
            (
                hvdic["stroke_count"],
                hvdic["radical"],
                hvdic["frequency"],
                components_json,
                char,
            ),
        )
        conn.commit()

        processed += 1
        if processed % 100 == 0:
            log.info(f"Progress: {i+1}/{len(chars)} — processed={processed}, skipped={skipped}, errors={errors}")

        if hvdic["stroke_count"] is None and hvdic["radical"] is None:
            errors += 1

    conn.close()
    log.info(f"Done. processed={processed}, skipped={skipped}, no-data errors={errors}")


if __name__ == "__main__":
    main()
