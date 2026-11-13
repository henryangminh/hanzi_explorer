"""
Import all 214 Kangxi radicals from sources/radical.csv into radical_groups.

The CSV is grouped by stroke count: a header row "Bộ thủ N Nét" precedes each group,
followed by rows: STT, radical (e.g. '人,亻'), name, pinyin, Vietnamese meaning.

Idempotent: re-running clears and re-imports the table.

Usage:
    python migration/dictionary/06_import_radicals.py
"""
import csv
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import SOURCES_DIR, connect_dictionary, require_source  # noqa: E402

CSV_PATH = SOURCES_DIR / 'radical.csv'


def parse_stroke_count(text: str) -> int | None:
    m = re.search(r'(\d+)', text)
    return int(m.group(1)) if m else None


def run():
    require_source(CSV_PATH)

    by_stt: dict[int, tuple] = {}
    current_strokes = None
    with open(CSV_PATH, encoding='utf-8', newline='') as f:
        for row in csv.reader(f):
            row = [cell.strip() for cell in row] + [''] * (5 - len(row))
            cell0 = row[0]

            if 'Bộ thủ' in cell0 and 'Nét' in cell0:
                current_strokes = parse_stroke_count(cell0)
                continue
            if cell0 == 'STT':
                continue

            # Strip non-numeric chars (e.g. '59<' in source CSV)
            nums = re.findall(r'\d+', cell0)
            if not nums or not row[1]:
                continue

            # (radical, pinyin, meaning_en, meaning_vi, stroke_count) — column 2 holds the radical's name
            by_stt[int(nums[0])] = (row[1], row[3], row[2], row[4], current_strokes)

    missing = sorted(set(range(1, 215)) - set(by_stt))
    if missing:
        print(f'  Warning — missing STT: {missing}')

    conn = connect_dictionary()
    conn.execute('DELETE FROM radical_groups')
    conn.executemany(
        'INSERT INTO radical_groups (radical, pinyin, meaning_en, meaning_vi, stroke_count) VALUES (?, ?, ?, ?, ?)',
        [by_stt[k] for k in sorted(by_stt)],
    )
    conn.commit()
    conn.close()
    print(f'Radicals: {len(by_stt)} imported (expected 214).')


if __name__ == '__main__':
    run()
