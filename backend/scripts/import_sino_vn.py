"""
Import Sino-Vietnamese (Hán Việt) readings from data/hanviet.csv into the sino_vietnamese table.
The CSV has columns: char, hanviet (Python list literal), pinyin (numeric tone)

Rows with empty hanviet lists are skipped.
Multiple hanviet readings for the same char+pinyin are stored comma-separated.

NOTE: CC-CEDICT must be imported before running this script, because we look up
      character_id from the characters table (populated by import_cedict.py).

Usage:
    cd backend && python scripts/import_sino_vn.py
"""
import ast
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from sqlmodel import Session, delete, select
from app.core.database import engine, init_db
from app.models.character import Character
from app.models.sino_vn import SinoVietnamese

CSV_PATH = Path(__file__).parent.parent / 'data' / 'hanviet.csv'


def run():
    if not CSV_PATH.exists():
        print(f'[ERROR] File not found: {CSV_PATH}')
        sys.exit(1)

    init_db()

    df = pd.read_csv(CSV_PATH)
    print(f'Loaded {len(df)} rows from hanviet.csv')

    with Session(engine) as session:
        deleted = session.exec(delete(SinoVietnamese)).rowcount
        session.commit()
        print(f'Cleared {deleted} existing sino_vietnamese rows')

        # Build lookup maps from characters table: simplified→id and traditional→id
        all_chars = session.exec(select(Character)).all()
        simp_to_id: dict[str, int] = {c.simplified: c.id for c in all_chars}
        trad_to_id: dict[str, int] = {
            c.traditional: c.id for c in all_chars if c.traditional
        }

        inserted = 0
        skipped = 0
        not_found = 0

        for _, row in df.iterrows():
            char = str(row['char']).strip()
            pinyin = str(row['pinyin']).strip()
            hanviet_raw = str(row['hanviet']).strip()

            # Parse Python list literal like ['thượng'] or ['càn', 'kiền'] or []
            try:
                hanviet_list = ast.literal_eval(hanviet_raw)
            except (ValueError, SyntaxError):
                skipped += 1
                continue

            if not isinstance(hanviet_list, list) or not hanviet_list:
                skipped += 1
                continue

            hanviet_str = ','.join(v.strip() for v in hanviet_list if v.strip())
            if not hanviet_str:
                skipped += 1
                continue

            # Resolve character_id — try simplified first, then traditional
            char_id = simp_to_id.get(char) or trad_to_id.get(char)
            if not char_id:
                not_found += 1
                continue

            session.add(SinoVietnamese(character_id=char_id, pinyin=pinyin, hanviet=hanviet_str))
            inserted += 1

        session.commit()
        print(f'Inserted {inserted} rows')
        print(f'Skipped {skipped} empty/invalid rows')
        print(f'Not found in characters table: {not_found}')


if __name__ == '__main__':
    run()
