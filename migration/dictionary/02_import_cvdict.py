"""
Import CVDICT (Chinese–Vietnamese) into dictionary.db: characters, pinyin_readings,
definitions (language='vi').

CVDICT format (same as CC-CEDICT):
    Traditional Simplified [pinyin] /nghĩa tiếng Việt 1/nghĩa 2/.../

Source: sources/CVDICT.u8 — https://github.com/ph0ngp/CVDICT
Idempotent: re-running replaces all CVDICT definitions.

Usage:
    python migration/dictionary/02_import_cvdict.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import SOURCES_DIR, CharacterIndex, connect_dictionary, finish_source, numeric_to_diacritic, require_source, upsert_source  # noqa: E402

DATA_FILE = SOURCES_DIR / "CVDICT.u8"
SOURCE_NAME = "CVDICT"


def parse_cvdict_line(line: str) -> dict | None:
    line = line.strip()
    if not line or line.startswith("#"):
        return None
    try:
        bracket_start = line.index("[")
        bracket_end = line.index("]")
        slash_start = line.index("/")

        chars_part = line[:bracket_start].strip().split()
        if len(chars_part) < 2:
            return None

        traditional = chars_part[0]
        simplified = chars_part[1]
        pinyin = line[bracket_start + 1:bracket_end].strip()
        meanings_raw = line[slash_start + 1:].rstrip("/")

        return {
            "traditional": traditional if traditional != simplified else None,
            "simplified": simplified,
            "pinyin_numeric": pinyin,
            "meaning_vi": meanings_raw,
        }
    except (ValueError, IndexError):
        return None


def main():
    require_source(DATA_FILE)
    conn = connect_dictionary()
    source_id = upsert_source(conn, SOURCE_NAME)
    chars = CharacterIndex(conn)
    readings = {(cid, py) for cid, py in conn.execute("SELECT character_id, pinyin_numeric FROM pinyin_readings")}

    total = skipped = 0
    with open(DATA_FILE, encoding="utf-8") as f:
        for line in f:
            parsed = parse_cvdict_line(line)
            if not parsed:
                skipped += 1
                continue

            cid = chars.get_or_create(parsed["simplified"], parsed["traditional"])
            pinyin_num = parsed["pinyin_numeric"]
            if (cid, pinyin_num) not in readings:
                conn.execute(
                    "INSERT INTO pinyin_readings (character_id, pinyin, pinyin_numeric) VALUES (?, ?, ?)",
                    (cid, numeric_to_diacritic(pinyin_num), pinyin_num),
                )
                readings.add((cid, pinyin_num))
            conn.execute(
                "INSERT INTO definitions (character_id, source_id, language, meaning_text) VALUES (?, ?, 'vi', ?)",
                (cid, source_id, parsed["meaning_vi"]),
            )
            total += 1

    finish_source(conn, source_id, total)
    conn.commit()
    conn.close()
    print(f"{SOURCE_NAME}: {total:,} definitions imported, {skipped:,} lines skipped (comments/blank).")


if __name__ == "__main__":
    main()
