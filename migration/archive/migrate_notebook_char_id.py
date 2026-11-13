"""
Migration: notebook_entries.char (string) → char_id (FK to characters.id)

Steps:
  1. Insert any chars from notebook_entries not yet in characters (simplified only, no definition)
  2. Add char_id column and populate it
  3. Recreate notebook_entries without the old char column
  4. Rebuild indexes and unique constraint

Usage:
    cd backend && python scripts/migrate_notebook_char_id.py
"""
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / 'data' / 'hanzi.db'


def migrate():
    if not DB_PATH.exists():
        print(f'[ERROR] Database not found: {DB_PATH}')
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = OFF")
    cur = conn.cursor()

    # ── Check current state ───────────────────────────────────────────
    cols = {r[1] for r in cur.execute("PRAGMA table_info(notebook_entries)").fetchall()}

    if 'char_id' in cols and 'char' not in cols:
        print("[INFO] Migration already done.")
        conn.close()
        return

    # Check if char_id column exists but values are not yet populated
    char_id_populated = False
    if 'char_id' in cols:
        count_populated = cur.execute(
            "SELECT COUNT(*) FROM notebook_entries WHERE char_id IS NOT NULL"
        ).fetchone()[0]
        char_id_populated = count_populated > 0

    if 'char_id' in cols and char_id_populated:
        print("[INFO] Partial migration detected (char_id populated) — resuming from step 3.")
    elif 'char_id' in cols and not char_id_populated:
        print("[INFO] char_id column exists but not populated — resuming from step 1.")
        # Fall through to step 1

    if 'char_id' not in cols or not char_id_populated:
        # ── 1. Insert missing characters ──────────────────────────────
        print("[1/3] Inserting chars missing from characters table...")
        missing = cur.execute("""
            SELECT DISTINCT ne.char
            FROM notebook_entries ne
            LEFT JOIN characters c ON c.simplified = ne.char OR c.traditional = ne.char
            WHERE c.id IS NULL
        """).fetchall()

        if missing:
            conn.executemany(
                "INSERT OR IGNORE INTO characters (simplified) VALUES (?)",
                missing,
            )
            conn.commit()
            print(f"  Inserted {len(missing)} new character stubs.")
        else:
            print("  No missing characters.")

        # ── 2. Add char_id column and populate ────────────────────────
        print("[2/3] Adding char_id column and populating...")
        if 'char_id' not in cols:
            cur.execute("ALTER TABLE notebook_entries ADD COLUMN char_id INTEGER")
            conn.commit()

        cur.execute("""
            UPDATE notebook_entries
            SET char_id = (
                SELECT c.id FROM characters c
                WHERE c.simplified = notebook_entries.char
                   OR c.traditional = notebook_entries.char
                LIMIT 1
            )
        """)
        conn.commit()

        unresolved = cur.execute(
            "SELECT COUNT(*) FROM notebook_entries WHERE char_id IS NULL"
        ).fetchone()[0]
        if unresolved:
            print(f"  [WARN] {unresolved} rows still have NULL char_id — will be dropped.")

    # ── 3. Recreate table without char column ────────────────────────
    print("[3/3] Recreating notebook_entries without char column...")
    cur.executescript("""
        CREATE TABLE notebook_entries_new (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            notebook_id INTEGER NOT NULL,
            char_id     INTEGER NOT NULL,
            added_at    DATETIME NOT NULL,
            FOREIGN KEY (notebook_id) REFERENCES notebooks (id),
            FOREIGN KEY (char_id)     REFERENCES characters (id),
            UNIQUE (notebook_id, char_id)
        );

        INSERT INTO notebook_entries_new (id, notebook_id, char_id, added_at)
        SELECT id, notebook_id, char_id, added_at
        FROM notebook_entries
        WHERE char_id IS NOT NULL;

        DROP TABLE notebook_entries;
        ALTER TABLE notebook_entries_new RENAME TO notebook_entries;

        CREATE INDEX IF NOT EXISTS ix_nb_entries_notebook ON notebook_entries (notebook_id);
        CREATE INDEX IF NOT EXISTS ix_nb_entries_char    ON notebook_entries (char_id);
    """)
    conn.commit()

    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA optimize")
    conn.close()
    print("\n[DONE] Migration complete!")


if __name__ == '__main__':
    migrate()
