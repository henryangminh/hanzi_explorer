"""
Import hanzi decomposition data from data/hanzi_decomposition.csv into hanzi_decomposition table.
CSV columns: character, component

Usage:
    cd backend && python scripts/import_decomposition.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from sqlmodel import Session, delete, select, text
from app.core.database import engine, init_db
from app.models.note import HanziDecomposition

CSV_PATH = Path(__file__).parent.parent / 'data' / 'hanzi_decomposition.csv'


def run():
    if not CSV_PATH.exists():
        print(f'[ERROR] File not found: {CSV_PATH}')
        sys.exit(1)

    init_db()

    df = pd.read_csv(CSV_PATH, encoding='utf-8-sig')
    df = df.dropna(subset=['character', 'component'])
    df['character'] = df['character'].astype(str).str.strip()
    df['component'] = df['component'].astype(str).str.strip()
    df = df[(df['character'] != '') & (df['component'] != '')]
    print(f'Loaded {len(df)} rows from hanzi_decomposition.csv')

    with Session(engine) as session:
        deleted = session.exec(delete(HanziDecomposition)).rowcount
        session.commit()
        print(f'Cleared {deleted} existing rows')

        batch = []
        for _, row in df.iterrows():
            batch.append(HanziDecomposition(
                character=row['character'],
                component=row['component'],
            ))
            if len(batch) >= 2000:
                session.add_all(batch)
                session.commit()
                batch = []

        if batch:
            session.add_all(batch)
            session.commit()

        total = session.exec(select(HanziDecomposition)).all()
        print(f'Inserted {len(total)} rows into hanzi_decomposition')


if __name__ == '__main__':
    run()
