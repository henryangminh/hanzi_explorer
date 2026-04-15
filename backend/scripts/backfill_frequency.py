"""
Backfill characters.frequency from drkameleon_characters.

Maps by simplified character (exact match). Overwrites any existing value
(including legacy text values like 'very_low') with the integer rank from
drkameleon_characters (lower rank = more frequent, e.g. 1 = most common).

Usage:
    cd backend && python scripts/backfill_frequency.py
"""
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / 'data' / 'hanzi.db'


def run():
    if not DB_PATH.exists():
        print(f'[ERROR] Database not found: {DB_PATH}')
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    cur = conn.cursor()

    # Verify source has frequency data
    cur.execute("SELECT COUNT(*) FROM drkameleon_characters WHERE frequency IS NOT NULL")
    source_count = cur.fetchone()[0]
    print(f'[info] drkameleon_characters rows with frequency: {source_count:,}')
    if source_count == 0:
        print('[ERROR] No frequency data found in drkameleon_characters.')
        sys.exit(1)

    # Ensure characters.frequency column is INTEGER (it may store text currently)
    # SQLite is flexible — just updating with CAST is enough; no DDL change needed.

    cur.execute("""
        UPDATE characters
        SET frequency = CAST(
            (SELECT frequency FROM drkameleon_characters dk
             WHERE dk.simplified = characters.simplified
               AND dk.frequency IS NOT NULL
             LIMIT 1)
        AS INTEGER)
        WHERE EXISTS (
            SELECT 1 FROM drkameleon_characters dk
            WHERE dk.simplified = characters.simplified
              AND dk.frequency IS NOT NULL
        )
    """)
    updated = cur.rowcount

    # Clear any remaining non-integer junk (e.g. legacy 'very_low' text) that
    # had no match in drkameleon — set to NULL rather than leave stale text.
    cur.execute("""
        UPDATE characters
        SET frequency = NULL
        WHERE frequency IS NOT NULL
          AND CAST(frequency AS INTEGER) = 0
          AND typeof(frequency) = 'text'
    """)
    cleared = cur.rowcount

    conn.commit()
    conn.close()

    print(f'[info] updated : {updated:,} rows in characters.frequency')
    if cleared:
        print(f'[info] cleared : {cleared:,} rows with unmatched legacy text values -> NULL')
    print('[done]')


if __name__ == '__main__':
    run()
