"""
Enrich characters table using local datasets (no network calls).

Sources:
  - Unihan Character Dictionary  → radical, stroke_count
  - 汉字部件典 (Component Dict) → components (via IDS 白易)

Logic:
  1. Build lookup dicts from local .tab.zip files.
  2. Get unique characters from hanzi_decomposition.
  3. For each char, check if it appears as `simplified` or `traditional`
     in characters table.
  4. Update radical + stroke_count (from simplified form).
     Update components (if char is simplified) or radical_traditional +
     components_traditional (if char is traditional).
"""

import json
import logging
import re
import sqlite3
import zipfile
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

DB_PATH = Path("/Users/henryangminh/Projects/hanzi_explorer/backend/data/hanzi.db")

DICT_DIR = Path("/Users/henryangminh/Projects/Chinese-Mandarin-Dictionaries")
UNIHAN_ZIP = DICT_DIR / "Unihan character dictionary 統一漢字典" / "Unihan Character Dictionary (字典).tab.zip"
COMPONENTS_ZIP = DICT_DIR / "汉字部件典 Character Component Dictionary" / "汉字部件典 Character Component Dictionary.tab.zip"

# IDS operator codepoints U+2FF0–U+2FFB
IDS_OPERATORS = set(chr(c) for c in range(0x2FF0, 0x2FFC))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def is_valid_component(char: str) -> bool:
    """Keep only single CJK characters (including radical supplement range)."""
    if len(char) != 1:
        return False
    cp = ord(char)
    return (
        0x2E80 <= cp <= 0x2EFF       # CJK Radicals Supplement
        or 0x2F00 <= cp <= 0x2FDF    # Kangxi Radicals
        or 0x3400 <= cp <= 0x9FFF    # CJK Extension A + Unified Ideographs
        or 0xF900 <= cp <= 0xFAFF    # CJK Compatibility Ideographs
        or 0x20000 <= cp <= 0x3134F  # CJK Extensions B-G
    )


def ids_to_components(ids_str: str) -> list[str]:
    """Extract leaf CJK characters from an IDS string, deduped, order-preserved."""
    seen: list[str] = []
    for ch in ids_str:
        if ch in IDS_OPERATORS:
            continue
        if is_valid_component(ch) and ch not in seen:
            seen.append(ch)
    return seen


def char_from_key(key: str) -> str | None:
    """
    Unihan key format:    {hex_codepoint}|{char}|U+{hex}   e.g. 6211|我|U+6211
    Component key format: {char}|U+{hex}|{hex_codepoint}   e.g. 我|U+6211|6211
    Returns the single character, or None for header/about rows.
    """
    parts = key.split("|")
    if len(parts) < 2:
        return None
    # Unihan: first part is a hex codepoint string (may contain A-F), third part starts with U+
    if len(parts) >= 3 and parts[2].startswith("U+") and len(parts[1]) == 1:
        return parts[1]
    # Component dict: first part is the char itself, second part starts with U+
    if parts[1].startswith("U+") and len(parts[0]) == 1:
        candidate = parts[0]
        if is_valid_component(candidate):
            return candidate
    return None


# ---------------------------------------------------------------------------
# Build Unihan lookup:  char -> (radical_char, stroke_count)
# ---------------------------------------------------------------------------

def build_unihan_lookup() -> dict[str, tuple[str | None, int | None]]:
    log.info(f"Loading Unihan from {UNIHAN_ZIP} ...")
    lookup: dict[str, tuple[str | None, int | None]] = {}

    with zipfile.ZipFile(UNIHAN_ZIP) as zf:
        name = zf.namelist()[0]
        with zf.open(name) as f:
            for raw in f:
                line = raw.decode("utf-8", errors="replace").rstrip("\n")
                tab = line.find("\t")
                if tab < 0:
                    continue
                key, html = line[:tab], line[tab + 1:]

                char = char_from_key(key)
                if not char:
                    continue

                # Radical char: Radical:</td><td>X</td>
                radical = None
                m = re.search(r"Radical:</td><td>([^<]+)</td>", html)
                if m:
                    raw_rad = m.group(1).strip()
                    # Keep first char only (sometimes includes spaces)
                    for ch in raw_rad:
                        if is_valid_component(ch):
                            radical = ch
                            break

                # Total strokes: Total strokes:</td><td>N</td>
                stroke_count = None
                m = re.search(r"Total strokes:</td><td>(\d+)</td>", html)
                if m:
                    stroke_count = int(m.group(1))

                if radical is not None or stroke_count is not None:
                    lookup[char] = (radical, stroke_count)

    log.info(f"Unihan lookup: {len(lookup):,} entries")
    return lookup


# ---------------------------------------------------------------------------
# Build component lookup:  char -> [components]  (from IDS 白易)
# ---------------------------------------------------------------------------

def build_components_lookup() -> dict[str, list[str]]:
    log.info(f"Loading 汉字部件典 from {COMPONENTS_ZIP} ...")
    lookup: dict[str, list[str]] = {}

    with zipfile.ZipFile(COMPONENTS_ZIP) as zf:
        name = zf.namelist()[0]
        with zf.open(name) as f:
            for raw in f:
                line = raw.decode("utf-8", errors="replace").rstrip("\n")
                tab = line.find("\t")
                if tab < 0:
                    continue
                key, html = line[:tab], line[tab + 1:]

                char = char_from_key(key)
                if not char:
                    continue

                # IDS (白易):</td><td>SEQUENCE</td>
                ids_str = None
                m = re.search(r"IDS \(白易\):</td><td>([^<]+)</td>", html)
                if m:
                    ids_str = m.group(1).strip()
                else:
                    # Fallback: IDS (Chise)
                    m = re.search(r"IDS \(Chise\):</td><td>([^<]+)</td>", html)
                    if m:
                        ids_str = m.group(1).strip()

                if ids_str:
                    components = ids_to_components(ids_str)
                    if components:
                        lookup[char] = components

    log.info(f"Component lookup: {len(lookup):,} entries")
    return lookup


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Build lookup dicts
    unihan = build_unihan_lookup()
    comp_lookup = build_components_lookup()

    # Unique characters in hanzi_decomposition
    chars: list[str] = [
        row[0]
        for row in conn.execute(
            "SELECT DISTINCT character FROM hanzi_decomposition ORDER BY character"
        )
    ]
    log.info(f"Unique chars in hanzi_decomposition: {len(chars):,}")

    # Build fast lookup: simplified -> row_id, traditional -> row_id
    simp_map: dict[str, int] = {}
    trad_map: dict[str, int] = {}
    for row in conn.execute("SELECT id, simplified, traditional FROM characters"):
        if row["simplified"]:
            simp_map[row["simplified"]] = row["id"]
        if row["traditional"]:
            trad_map[row["traditional"]] = row["id"]

    processed = skipped = 0

    for char in chars:
        is_simp = char in simp_map
        is_trad = char in trad_map

        if not is_simp and not is_trad:
            skipped += 1
            continue

        # --- radical + stroke_count (use the char itself for lookup) ---
        radical, stroke_count = unihan.get(char, (None, None))

        # --- components ---
        components = comp_lookup.get(char)
        components_json = json.dumps(components, ensure_ascii=False) if components else None

        if is_simp:
            row_id = simp_map[char]
            conn.execute(
                """UPDATE characters
                   SET radical      = COALESCE(?, radical),
                       stroke_count = COALESCE(?, stroke_count),
                       components   = COALESCE(?, components)
                   WHERE id = ?""",
                (radical, stroke_count, components_json, row_id),
            )

        if is_trad:
            row_id = trad_map[char]
            # radical/stroke_count: only fill if not already set by simplified form
            # radical_traditional + stroke_count_traditional + components_traditional: always from traditional char
            conn.execute(
                """UPDATE characters
                   SET radical                  = COALESCE(radical, ?),
                       stroke_count             = COALESCE(stroke_count, ?),
                       radical_traditional      = COALESCE(?, radical_traditional),
                       stroke_count_traditional = COALESCE(?, stroke_count_traditional),
                       components_traditional   = COALESCE(?, components_traditional)
                   WHERE id = ?""",
                (radical, stroke_count, radical, stroke_count, components_json, row_id),
            )

        processed += 1
        if processed % 1000 == 0:
            conn.commit()
            log.info(f"  {processed:,} processed, {skipped:,} skipped")

    conn.commit()
    conn.close()
    log.info(f"Done. processed={processed:,}, skipped={skipped:,}")


if __name__ == "__main__":
    main()
