"""
Enrich characters with radical, stroke count and components from local datasets (no network).

Sources (extracted from https://github.com/lxs602/Chinese-Mandarin-Dictionaries by
archive/extract_cmd_dicts.py):
  - sources/unihan_radical_strokes.tsv  ← Unihan Character Dictionary  → radical, stroke_count
  - sources/hanzi_components_ids.tsv    ← 汉字部件典 (Component Dict) → components (IDS 白易, fallback Chise)

Only characters listed in hanzi_decomposition (07_import_decomposition.py) are enriched.
Characters IDS has no components for fall back to their rows in hanzi_decomposition.
A character matching a `simplified` row updates radical/stroke_count/components; matching a
`traditional` row fills the *_traditional columns.
"""

import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import SOURCES_DIR, connect_dictionary, require_source  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

UNIHAN_TSV = SOURCES_DIR / "unihan_radical_strokes.tsv"
COMPONENTS_TSV = SOURCES_DIR / "hanzi_components_ids.tsv"


# ---------------------------------------------------------------------------
# Build Unihan lookup:  char -> (radical_char, stroke_count)
# ---------------------------------------------------------------------------

def build_unihan_lookup() -> dict[str, tuple[str | None, int | None]]:
    log.info(f"Loading Unihan from {UNIHAN_TSV} ...")
    lookup: dict[str, tuple[str | None, int | None]] = {}

    with open(UNIHAN_TSV, encoding="utf-8") as f:
        for line in f:
            char, radical, stroke_count = line.rstrip("\n").split("\t")
            lookup[char] = (radical or None, int(stroke_count) if stroke_count else None)

    log.info(f"Unihan lookup: {len(lookup):,} entries")
    return lookup


# ---------------------------------------------------------------------------
# Build component lookup:  char -> [components]
# ---------------------------------------------------------------------------

def build_components_lookup() -> dict[str, list[str]]:
    log.info(f"Loading 汉字部件典 from {COMPONENTS_TSV} ...")
    lookup: dict[str, list[str]] = {}

    with open(COMPONENTS_TSV, encoding="utf-8") as f:
        for line in f:
            char, components = line.rstrip("\n").split("\t")
            lookup[char] = components.split(" ")

    log.info(f"Component lookup: {len(lookup):,} entries")
    return lookup


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def decomposition_components(char: str, parts: list[str]) -> list[str]:
    """Components from hanzi_decomposition: every part except the char itself; a char that only
    decomposes into itself (e.g. 鿏) keeps itself as its single component."""
    return [p for p in parts if p != char] or parts


def fill_components_from_decomposition(conn) -> int:
    """Fallback for characters IDS gave no components for: use sources/hanzi_decomposition.csv."""
    parts_by_char: dict[str, list[str]] = {}
    for char, component in conn.execute("SELECT character, component FROM hanzi_decomposition ORDER BY id"):
        parts_by_char.setdefault(char, []).append(component)

    updates = [
        (json.dumps(decomposition_components(simplified, parts_by_char[simplified]), ensure_ascii=False), row_id)
        for row_id, simplified in conn.execute("SELECT id, simplified FROM characters WHERE components IS NULL")
        if simplified in parts_by_char
    ]
    conn.executemany("UPDATE characters SET components = ? WHERE id = ?", updates)
    return len(updates)


def main():
    require_source(UNIHAN_TSV)
    require_source(COMPONENTS_TSV)
    conn = connect_dictionary()

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
    for row_id, simplified, traditional in conn.execute("SELECT id, simplified, traditional FROM characters"):
        if simplified:
            simp_map[simplified] = row_id
        if traditional:
            trad_map[traditional] = row_id

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
    log.info(f"IDS enrichment done. processed={processed:,}, skipped={skipped:,}")

    filled = fill_components_from_decomposition(conn)
    conn.commit()
    conn.close()
    log.info(f"Components filled from hanzi_decomposition: {filled:,}")


if __name__ == "__main__":
    main()
