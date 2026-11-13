"""
Import CC-CEDICT into dictionary.db: characters, pinyin_readings, definitions (language='en').

Supports multiple entries per character (different readings / tones / meanings),
e.g. 中: zhōng (middle) AND zhòng (to hit a target).

Source: sources/cedict_ts.u8 — https://www.mdbg.net/chinese/dictionary?page=cedict
Idempotent: re-running replaces all CC-CEDICT definitions.

Usage:
    python migration/dictionary/01_import_cedict.py
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import SOURCES_DIR, CharacterIndex, connect_dictionary, finish_source, numeric_to_diacritic, require_source, upsert_source  # noqa: E402

CEDICT_PATH = SOURCES_DIR / "cedict_ts.u8"
SOURCE_NAME = "CC-CEDICT"
LINE_RE = re.compile(r'^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+/(.+)/$')


def parse_line(line: str) -> dict | None:
    m = LINE_RE.match(line)
    if not m:
        return None
    traditional, simplified, pinyin_raw, meanings_raw = m.groups()
    return {
        'traditional': traditional if traditional != simplified else None,
        'simplified': simplified,
        'pinyin_numeric': pinyin_raw.strip(),
        'meaning_en': '; '.join(meanings_raw.split('/')),
    }


def run():
    require_source(CEDICT_PATH)
    conn = connect_dictionary()
    source_id = upsert_source(conn, SOURCE_NAME)
    chars = CharacterIndex(conn)
    readings = {(cid, py) for cid, py in conn.execute("SELECT character_id, pinyin_numeric FROM pinyin_readings")}

    inserted = 0
    with open(CEDICT_PATH, encoding='utf-8') as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith('#'):
                continue
            parsed = parse_line(line)
            if not parsed:
                continue

            cid = chars.get_or_create(parsed['simplified'], parsed['traditional'])
            pinyin_num = parsed['pinyin_numeric']
            if (cid, pinyin_num) not in readings:
                conn.execute(
                    "INSERT INTO pinyin_readings (character_id, pinyin, pinyin_numeric) VALUES (?, ?, ?)",
                    (cid, numeric_to_diacritic(pinyin_num), pinyin_num),
                )
                readings.add((cid, pinyin_num))
            conn.execute(
                "INSERT INTO definitions (character_id, source_id, language, meaning_text) VALUES (?, ?, 'en', ?)",
                (cid, source_id, parsed['meaning_en']),
            )
            inserted += 1

    finish_source(conn, source_id, inserted)
    conn.commit()
    conn.close()
    print(f'{SOURCE_NAME}: {inserted:,} definitions imported.')


if __name__ == '__main__':
    run()
