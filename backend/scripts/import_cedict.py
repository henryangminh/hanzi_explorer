"""
Import CC-CEDICT into SQLite using the new normalized schema.
Creates/updates rows in: characters, pinyin_readings, definitions.

Supports multiple entries per character (different readings / tones / meanings).
e.g. 中: zhōng (middle) AND zhòng (to hit a target)

Usage:
    python scripts/import_cedict.py

Download CC-CEDICT from:
    https://www.mdbg.net/chinese/dictionary?page=cedict
Extract cedict_ts.u8 into backend/data/
"""
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select
from app.core.database import engine, init_db
from app.core.pinyin import numeric_to_diacritic
from app.models.character import Character, PinyinReading, Definition, DictionarySource

CEDICT_PATH = Path(__file__).parent.parent / 'data' / 'cedict_ts.u8'
SOURCE_NAME = 'CC-CEDICT'
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
    if not CEDICT_PATH.exists():
        print(f'[ERROR] File not found: {CEDICT_PATH}')
        sys.exit(1)

    init_db()

    with Session(engine) as session:
        # Upsert source record
        source = session.exec(
            select(DictionarySource).where(DictionarySource.name == SOURCE_NAME)
        ).first()
        if not source:
            source = DictionarySource(name=SOURCE_NAME)
            session.add(source)
            session.commit()
            session.refresh(source)

        # Delete existing definitions for this source (idempotent re-import)
        from sqlmodel import delete
        session.exec(delete(Definition).where(Definition.source_id == source.id))
        session.commit()
        print(f'Cleared existing {SOURCE_NAME} definitions. Importing...')

        inserted = 0
        with open(CEDICT_PATH, encoding='utf-8') as f:
            for raw_line in f:
                line = raw_line.strip()
                if not line or line.startswith('#'):
                    continue
                parsed = parse_line(line)
                if not parsed:
                    continue

                simplified = parsed['simplified']
                traditional = parsed['traditional']
                pinyin_num = parsed['pinyin_numeric']
                meaning_en = parsed['meaning_en']

                # Upsert character
                char_row = session.exec(
                    select(Character).where(Character.simplified == simplified)
                ).first()
                if not char_row:
                    char_row = Character(simplified=simplified, traditional=traditional)
                    session.add(char_row)
                    session.flush()
                elif traditional and not char_row.traditional:
                    char_row.traditional = traditional
                    session.add(char_row)
                    session.flush()

                # Insert pinyin reading (skip if already exists for this character+numeric pinyin)
                existing_pinyin = session.exec(
                    select(PinyinReading)
                    .where(PinyinReading.character_id == char_row.id)
                    .where(PinyinReading.pinyin_numeric == pinyin_num)
                ).first()
                if not existing_pinyin:
                    session.add(PinyinReading(
                        character_id=char_row.id,
                        pinyin=numeric_to_diacritic(pinyin_num),
                        pinyin_numeric=pinyin_num,
                    ))
                    session.flush()

                # Insert definition
                session.add(Definition(
                    character_id=char_row.id,
                    source_id=source.id,
                    language='en',
                    meaning_text=meaning_en,
                ))
                inserted += 1

                if inserted % 5000 == 0:
                    session.commit()
                    print(f'  Inserted {inserted}...')

        # Update source metadata
        source.entry_count = inserted
        source.version = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        source.imported_at = datetime.now(timezone.utc).isoformat()
        session.add(source)
        session.commit()

    print(f'\nDone. Total inserted: {inserted}')


if __name__ == '__main__':
    run()
