"""
Import radicals from data/radical.csv into radical_groups table.
Clears existing data first.

Usage:
    python scripts/import_radicals_csv.py
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from sqlmodel import Session, delete, select
from app.core.database import engine, init_db
from app.models.note import RadicalGroup, RadicalCompound

CSV_PATH = Path(__file__).parent.parent / 'data' / 'radical.csv'


def parse_stroke_count(text: str) -> int | None:
    """Extract number from 'Bộ thủ 2 Nét' → 2"""
    m = re.search(r'(\d+)', str(text))
    return int(m.group(1)) if m else None


def clean_radical(text: str) -> str:
    """'人 (亻)' → '人', keep first char/group before space+paren"""
    text = str(text).strip()
    # If contains space followed by (, take part before it
    m = re.match(r'^([^\s(]+)', text)
    return m.group(1) if m else text


def run():
    if not CSV_PATH.exists():
        print(f'[ERROR] File not found: {CSV_PATH}')
        sys.exit(1)

    init_db()

    df = pd.read_csv(CSV_PATH, header=None)

    radicals = []
    current_strokes = None

    for _, row in df.iterrows():
        cell0 = str(row[0]).strip()

        # Stroke group header: "Bộ thủ 2 Nét"
        if 'Bộ thủ' in cell0 and 'Nét' in cell0:
            current_strokes = parse_stroke_count(cell0)
            continue

        # Sub-header row: "STT BỘ THỦ ..."
        if cell0 == 'STT':
            continue

        # Data row: must have numeric STT
        try:
            int(float(cell0))
        except (ValueError, TypeError):
            continue

        radical_raw = str(row[1]).strip() if pd.notna(row[1]) else ''
        name_vi     = str(row[2]).strip() if pd.notna(row[2]) else ''
        pinyin      = str(row[3]).strip() if pd.notna(row[3]) else ''
        meaning_vi  = str(row[4]).strip() if pd.notna(row[4]) else ''

        if not radical_raw or radical_raw == 'nan':
            continue

        radical_char = clean_radical(radical_raw)

        radicals.append({
            'radical':      radical_char,
            'pinyin':       pinyin,
            'meaning_en':   name_vi,   # CSV only has Vietnamese name — use as meaning_en fallback
            'meaning_vi':   meaning_vi,
            'stroke_count': current_strokes,
        })

    print(f'Parsed {len(radicals)} radicals from CSV')

    with Session(engine) as session:
        # Clear existing
        session.exec(delete(RadicalCompound))
        session.exec(delete(RadicalGroup))
        session.commit()
        print('Cleared existing radical data')

        # Insert all
        for r in radicals:
            session.add(RadicalGroup(**r))

        session.commit()
        print(f'Inserted {len(radicals)} radical groups')

        # Verify
        count = len(session.exec(select(RadicalGroup)).all())
        print(f'Verified: {count} rows in radical_groups')


if __name__ == '__main__':
    run()
