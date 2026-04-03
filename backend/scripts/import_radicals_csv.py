"""
Import all 214 Kangxi radicals from data/radical.csv.
Clears all radical data (compounds + groups) before importing.

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
    m = re.search(r'(\d+)', str(text))
    return int(m.group(1)) if m else None


def clean_radical(text: str) -> str:
    """
    CSV column is already normalized to comma-separated form e.g. '川,巛' or '人,亻'.
    Just strip whitespace and return as-is.
    """
    return str(text).strip()


def run():
    if not CSV_PATH.exists():
        print(f'[ERROR] File not found: {CSV_PATH}')
        sys.exit(1)

    init_db()

    df = pd.read_csv(CSV_PATH, header=None)

    by_stt: dict[int, dict] = {}
    current_strokes = None

    for _, row in df.iterrows():
        cell0 = str(row[0]).strip()

        if 'Bộ thủ' in cell0 and 'Nét' in cell0:
            current_strokes = parse_stroke_count(cell0)
            continue
        if cell0 == 'STT':
            continue

        # Strip non-numeric chars (e.g. '59<' in source CSV)
        nums = re.findall(r'\d+', cell0)
        if not nums:
            continue
        stt = int(nums[0])

        radical_raw = str(row[1]).strip() if pd.notna(row[1]) else ''
        if not radical_raw or radical_raw == 'nan':
            continue

        by_stt[stt] = {
            'radical':      clean_radical(radical_raw),
            'pinyin':       str(row[3]).strip() if pd.notna(row[3]) else '',
            'meaning_en':   str(row[2]).strip() if pd.notna(row[2]) else '',
            'meaning_vi':   str(row[4]).strip() if pd.notna(row[4]) else '',
            'stroke_count': current_strokes,
        }

    radicals = [by_stt[k] for k in sorted(by_stt)]
    print(f'Parsed {len(radicals)} radicals (expected 214)')

    missing = sorted(set(range(1, 215)) - set(by_stt.keys()))
    if missing:
        print(f'  Warning — missing STT: {missing}')

    with Session(engine) as session:
        # Clear all radical data first
        deleted_compounds = session.exec(delete(RadicalCompound)).rowcount
        deleted_groups    = session.exec(delete(RadicalGroup)).rowcount
        session.commit()
        print(f'Cleared {deleted_groups} radical groups, {deleted_compounds} compounds')

        for r in radicals:
            session.add(RadicalGroup(**r))
        session.commit()

        count = session.exec(select(RadicalGroup)).all()
        print(f'Done. Inserted {len(count)} radical groups.')


if __name__ == '__main__':
    run()
