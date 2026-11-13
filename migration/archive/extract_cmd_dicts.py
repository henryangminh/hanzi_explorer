"""
One-time extraction of the data 09_enrich_unihan.py needs from two large zips (~107MB) in
https://github.com/lxs602/Chinese-Mandarin-Dictionaries into small TSVs under migration/sources/,
so the pipeline no longer needs that checkout.

  - Unihan Character Dictionary  → sources/unihan_radical_strokes.tsv  (char, radical, stroke_count)
  - 汉字部件典 (Component Dict) → sources/hanzi_components_ids.tsv     (char, space-separated components
                                   from IDS 白易, fallback IDS Chise)

Usage:
    CMD_DICTS_DIR=~/Projects/Chinese-Mandarin-Dictionaries python migration/archive/extract_cmd_dicts.py
"""

import os
import re
import zipfile
from pathlib import Path

MIGRATION_DIR = Path(__file__).resolve().parent.parent
SOURCES_DIR = MIGRATION_DIR / "sources"

DICT_DIR = Path(os.environ.get("CMD_DICTS_DIR", Path.home() / "Projects" / "Chinese-Mandarin-Dictionaries")).expanduser()
UNIHAN_ZIP = DICT_DIR / "Unihan character dictionary 統一漢字典" / "Unihan Character Dictionary (字典).tab.zip"
COMPONENTS_ZIP = DICT_DIR / "汉字部件典 Character Component Dictionary" / "汉字部件典 Character Component Dictionary.tab.zip"

UNIHAN_TSV = SOURCES_DIR / "unihan_radical_strokes.tsv"
COMPONENTS_TSV = SOURCES_DIR / "hanzi_components_ids.tsv"

# IDS operator codepoints U+2FF0–U+2FFB
IDS_OPERATORS = set(chr(c) for c in range(0x2FF0, 0x2FFC))


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


def iter_entries(zip_path: Path):
    """Yield (char, html) for every character entry of a .tab.zip dictionary."""
    with zipfile.ZipFile(zip_path) as zf:
        name = zf.namelist()[0]
        with zf.open(name) as f:
            for raw in f:
                line = raw.decode("utf-8", errors="replace").rstrip("\n")
                tab = line.find("\t")
                if tab < 0:
                    continue
                char = char_from_key(line[:tab])
                if char:
                    yield char, line[tab + 1:]


def extract_unihan() -> dict[str, tuple[str, str]]:
    lookup: dict[str, tuple[str, str]] = {}
    for char, html in iter_entries(UNIHAN_ZIP):
        # Radical char: Radical:</td><td>X</td>  — keep first CJK char only (sometimes includes spaces)
        radical = ""
        m = re.search(r"Radical:</td><td>([^<]+)</td>", html)
        if m:
            radical = next((ch for ch in m.group(1).strip() if is_valid_component(ch)), "")

        # Total strokes: Total strokes:</td><td>N</td>
        m = re.search(r"Total strokes:</td><td>(\d+)</td>", html)
        stroke_count = m.group(1) if m else ""

        if radical or stroke_count:
            lookup[char] = (radical, stroke_count)
    return lookup


def extract_components() -> dict[str, list[str]]:
    lookup: dict[str, list[str]] = {}
    for char, html in iter_entries(COMPONENTS_ZIP):
        # IDS (白易):</td><td>SEQUENCE</td>, fallback IDS (Chise)
        m = (re.search(r"IDS \(白易\):</td><td>([^<]+)</td>", html)
             or re.search(r"IDS \(Chise\):</td><td>([^<]+)</td>", html))
        if m:
            components = ids_to_components(m.group(1).strip())
            if components:
                lookup[char] = components
    return lookup


def main():
    for path in (UNIHAN_ZIP, COMPONENTS_ZIP):
        if not path.exists():
            raise SystemExit(f"[ERROR] Source file not found: {path}")

    unihan = extract_unihan()
    with open(UNIHAN_TSV, "w", encoding="utf-8") as f:
        for char, (radical, stroke_count) in unihan.items():
            f.write(f"{char}\t{radical}\t{stroke_count}\n")
    print(f"{UNIHAN_TSV.name}: {len(unihan):,} rows")

    components = extract_components()
    with open(COMPONENTS_TSV, "w", encoding="utf-8") as f:
        for char, parts in components.items():
            f.write(f"{char}\t{' '.join(parts)}\n")
    print(f"{COMPONENTS_TSV.name}: {len(components):,} rows")


if __name__ == "__main__":
    main()
