"""
Migrate user_notes table from old schema (meaning_vi, note, tags)
to new schema (title, detail).

Data migration logic:
  - If meaning_vi is set: title = meaning_vi, detail = note (if note is also set)
  - If meaning_vi is null but note is set: title = note, detail = null
  - If both null: title = 'Ghi chú', detail = null
  - tags column is dropped (not migrated)

Usage:
    cd backend && python scripts/migrate_notes.py
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
    conn.execute("PRAGMA foreign_keys = OFF")
    cur = conn.cursor()

    # Check current columns
    cols = {row[1] for row in cur.execute("PRAGMA table_info(user_notes)").fetchall()}
    print(f"[INFO] Current user_notes columns: {sorted(cols)}")

    if 'title' in cols and 'meaning_vi' not in cols:
        print("[INFO] Migration already done.")
        conn.close()
        return

    # Step 1: Add new columns (if not exist)
    if 'title' not in cols:
        cur.execute("ALTER TABLE user_notes ADD COLUMN title VARCHAR(200) NOT NULL DEFAULT ''")
        print("[1/4] Added 'title' column.")
    if 'detail' not in cols:
        cur.execute("ALTER TABLE user_notes ADD COLUMN detail TEXT")
        print("[1/4] Added 'detail' column.")
    conn.commit()

    # Step 2: Migrate data from old columns
    if 'meaning_vi' in cols or 'note' in cols:
        cur.execute("""
            UPDATE user_notes SET
              title = CASE
                WHEN meaning_vi IS NOT NULL AND TRIM(meaning_vi) != '' THEN TRIM(meaning_vi)
                WHEN note IS NOT NULL AND TRIM(note) != '' THEN TRIM(note)
                ELSE 'Ghi chú'
              END,
              detail = CASE
                WHEN meaning_vi IS NOT NULL AND TRIM(meaning_vi) != ''
                     AND note IS NOT NULL AND TRIM(note) != '' THEN TRIM(note)
                ELSE NULL
              END
        """)
        conn.commit()
        print(f"[2/4] Migrated {cur.rowcount} rows.")

    # Step 3: Recreate table without old columns
    print("[3/4] Recreating user_notes table without old columns...")
    cur.executescript("""
        CREATE TABLE user_notes_new (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL REFERENCES users(id),
            char        VARCHAR(10) NOT NULL,
            title       VARCHAR(200) NOT NULL DEFAULT '',
            detail      TEXT,
            created_at  TEXT,
            updated_at  TEXT
        );

        INSERT INTO user_notes_new (id, user_id, char, title, detail, created_at, updated_at)
        SELECT id, user_id, char, title, detail, created_at, updated_at
        FROM user_notes;

        DROP TABLE user_notes;
        ALTER TABLE user_notes_new RENAME TO user_notes;

        CREATE INDEX IF NOT EXISTS ix_user_notes_user_id ON user_notes (user_id);
        CREATE INDEX IF NOT EXISTS ix_user_notes_char ON user_notes (char);
    """)
    conn.commit()

    # Step 4: Verify
    new_cols = {row[1] for row in cur.execute("PRAGMA table_info(user_notes)").fetchall()}
    count = cur.execute("SELECT COUNT(*) FROM user_notes").fetchone()[0]
    print(f"[4/4] Done. New columns: {sorted(new_cols)}. Rows: {count}.")

    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA optimize")
    conn.close()
    print("\n[DONE] Migration complete!")


if __name__ == '__main__':
    migrate()
