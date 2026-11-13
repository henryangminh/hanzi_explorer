"""
Import hanzi decomposition data from sources/hanzi_decomposition.csv into hanzi_decomposition.
CSV columns: character, component

This table is staging data: 09_enrich_unihan.py uses it to decide which characters to enrich.

Idempotent: re-running clears and re-imports the table.

Usage:
    python migration/dictionary/07_import_decomposition.py
"""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import SOURCES_DIR, connect_dictionary, require_source  # noqa: E402

CSV_PATH = SOURCES_DIR / 'hanzi_decomposition.csv'


def run():
    require_source(CSV_PATH)
    with open(CSV_PATH, encoding='utf-8-sig', newline='') as f:
        rows = [
            (r['character'].strip(), r['component'].strip())
            for r in csv.DictReader(f)
            if r['character'] and r['component'] and r['character'].strip() and r['component'].strip()
        ]

    conn = connect_dictionary()
    conn.execute('DELETE FROM hanzi_decomposition')
    conn.executemany('INSERT INTO hanzi_decomposition (character, component) VALUES (?, ?)', rows)
    conn.commit()
    conn.close()
    print(f'Decomposition: {len(rows):,} rows imported.')


if __name__ == '__main__':
    run()
