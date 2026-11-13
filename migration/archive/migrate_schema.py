"""
In-place migration of hanzi.db from old schema to new normalized schema.

Old tables migrated:
  cc_cedict_characters → characters + pinyin_readings + definitions (language='en')
  cvdict_characters    → definitions (language='vi')
                         + characters/pinyin_readings updated where missing
  sino_vn              → sino_vietnamese

Preserved unchanged:
  users, user_notes, notebooks, notebook_entries,
  dictionary_sources, external_cache,
  radical_groups, radical_compounds, hanzi_decomposition,
  drkameleon_characters, drkameleon_forms

Uses bulk INSERT with ON CONFLICT for performance (~120k rows in seconds).

Usage:
    cd backend && python scripts/migrate_schema.py
"""
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.pinyin import numeric_to_diacritic

DB_PATH = Path(__file__).parent.parent / 'data' / 'hanzi.db'


def migrate():
    if not DB_PATH.exists():
        print(f'[ERROR] Database not found: {DB_PATH}')
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA foreign_keys = OFF")
    cur = conn.cursor()

    # ── Check if migration already done ──────────────────────────────
    existing = {r[0] for r in cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}

    if 'characters' in existing and 'cc_cedict_characters' not in existing:
        print("[INFO] Migration already done.")
        conn.close()
        return

    # Clear partially-migrated new tables before retrying (idempotent)
    for tbl in ('sino_vietnamese', 'definitions', 'pinyin_readings', 'characters'):
        if tbl in existing:
            cur.execute(f"DELETE FROM {tbl}")
    conn.commit()

    # ── 1. Create new tables ──────────────────────────────────────────
    print("[1/5] Creating new tables...")
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS characters (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            simplified   VARCHAR(10) NOT NULL UNIQUE,
            traditional  VARCHAR(10),
            radical      VARCHAR(10),
            stroke_count INTEGER,
            hsk_level    INTEGER,
            frequency    INTEGER,
            is_common    BOOLEAN DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS ix_char_hsk ON characters (hsk_level);

        CREATE TABLE IF NOT EXISTS pinyin_readings (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id    INTEGER NOT NULL,
            pinyin          VARCHAR(100) NOT NULL,
            pinyin_numeric  VARCHAR(100),
            tone            INTEGER,
            FOREIGN KEY(character_id) REFERENCES characters (id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS ix_pinyin_lookup ON pinyin_readings (pinyin);

        CREATE TABLE IF NOT EXISTS definitions (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id INTEGER NOT NULL,
            source_id    INTEGER NOT NULL,
            language     VARCHAR(5) NOT NULL,
            meaning_text TEXT NOT NULL,
            pos          TEXT,
            FOREIGN KEY(character_id) REFERENCES characters (id) ON DELETE CASCADE,
            FOREIGN KEY(source_id)    REFERENCES dictionary_sources (id)
        );

        CREATE TABLE IF NOT EXISTS sino_vietnamese (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id INTEGER NOT NULL,
            hanviet      VARCHAR(100) NOT NULL,
            pinyin       VARCHAR(20),
            FOREIGN KEY(character_id) REFERENCES characters (id) ON DELETE CASCADE
        );
    """)
    conn.commit()
    print("  Done.")

    # ── 2. Migrate CC-CEDICT ──────────────────────────────────────────
    if 'cc_cedict_characters' in existing:
        print("[2/5] Migrating CC-CEDICT (bulk)...")
        cedict_row = cur.execute(
            "SELECT id FROM dictionary_sources WHERE name = 'CC-CEDICT'"
        ).fetchone()
        if not cedict_row:
            print("  [WARN] CC-CEDICT source not found, skipping.")
        else:
            cedict_src_id = cedict_row[0]
            rows = cur.execute(
                "SELECT simplified, traditional, pinyin, meaning_en, radical, stroke_count "
                "FROM cc_cedict_characters"
            ).fetchall()

            # Step A: bulk upsert characters (unique by simplified)
            char_data = {}  # simplified → (traditional, radical, stroke_count)
            for simplified, traditional, pinyin, meaning_en, radical, stroke_count in rows:
                if simplified not in char_data:
                    char_data[simplified] = (traditional, radical, stroke_count)

            conn.executemany(
                """INSERT INTO characters (simplified, traditional, radical, stroke_count)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(simplified) DO UPDATE SET
                       traditional  = COALESCE(characters.traditional,  excluded.traditional),
                       radical      = COALESCE(characters.radical,      excluded.radical),
                       stroke_count = COALESCE(characters.stroke_count, excluded.stroke_count)""",
                [(s, t, r, sc) for s, (t, r, sc) in char_data.items()]
            )
            conn.commit()

            # Build simplified → character_id map
            simp_to_id = dict(cur.execute("SELECT simplified, id FROM characters").fetchall())

            # Step B: bulk insert pinyin_readings — deduplicate (char_id, pinyin_numeric)
            seen_pinyins: set[tuple] = set()
            pinyin_batch = []
            for simplified, traditional, pinyin_num, meaning_en, radical, stroke_count in rows:
                cid = simp_to_id[simplified]
                key = (cid, pinyin_num)
                if key not in seen_pinyins:
                    seen_pinyins.add(key)
                    try:
                        diacritic = numeric_to_diacritic(pinyin_num)
                    except Exception:
                        diacritic = pinyin_num
                    pinyin_batch.append((cid, diacritic, pinyin_num))

            conn.executemany(
                "INSERT OR IGNORE INTO pinyin_readings (character_id, pinyin, pinyin_numeric) VALUES (?, ?, ?)",
                pinyin_batch
            )
            conn.commit()

            # Step C: bulk insert definitions
            def_batch = [
                (simp_to_id[simplified], cedict_src_id, 'en', meaning_en)
                for simplified, traditional, pinyin_num, meaning_en, radical, stroke_count in rows
            ]
            conn.executemany(
                "INSERT INTO definitions (character_id, source_id, language, meaning_text) VALUES (?, ?, ?, ?)",
                def_batch
            )
            conn.commit()
            print(f"  Migrated {len(rows):,} CC-CEDICT entries ({len(char_data):,} unique characters).")
    else:
        print("[2/5] cc_cedict_characters not found, skipping.")

    # ── 3. Migrate CVDICT ─────────────────────────────────────────────
    if 'cvdict_characters' in existing:
        print("[3/5] Migrating CVDICT (bulk)...")
        cvdict_row = cur.execute(
            "SELECT id FROM dictionary_sources WHERE name = 'CVDICT'"
        ).fetchone()
        if not cvdict_row:
            print("  [WARN] CVDICT source not found, skipping.")
        else:
            cvdict_src_id = cvdict_row[0]
            rows = cur.execute(
                "SELECT simplified, traditional, pinyin, meaning_vi FROM cvdict_characters"
            ).fetchall()

            # Step A: upsert any characters not already in the table
            conn.executemany(
                """INSERT INTO characters (simplified, traditional)
                   VALUES (?, ?)
                   ON CONFLICT(simplified) DO UPDATE SET
                       traditional = COALESCE(characters.traditional, excluded.traditional)""",
                [(r[0], r[1]) for r in rows]
            )
            conn.commit()

            simp_to_id = dict(cur.execute("SELECT simplified, id FROM characters").fetchall())

            # Step B: fill in missing pinyin_readings
            existing_pinyins = {
                (r[0], r[1])
                for r in cur.execute(
                    "SELECT character_id, pinyin_numeric FROM pinyin_readings"
                ).fetchall()
            }
            pinyin_batch = []
            seen_new: set[tuple] = set()
            for simplified, traditional, pinyin_num, meaning_vi in rows:
                cid = simp_to_id.get(simplified)
                if not cid:
                    continue
                key = (cid, pinyin_num)
                if key not in existing_pinyins and key not in seen_new:
                    seen_new.add(key)
                    try:
                        diacritic = numeric_to_diacritic(pinyin_num)
                    except Exception:
                        diacritic = pinyin_num
                    pinyin_batch.append((cid, diacritic, pinyin_num))

            if pinyin_batch:
                conn.executemany(
                    "INSERT OR IGNORE INTO pinyin_readings (character_id, pinyin, pinyin_numeric) VALUES (?, ?, ?)",
                    pinyin_batch
                )
                conn.commit()

            # Step C: bulk insert vi definitions
            def_batch = [
                (simp_to_id[r[0]], cvdict_src_id, 'vi', r[3])
                for r in rows if r[0] in simp_to_id
            ]
            conn.executemany(
                "INSERT INTO definitions (character_id, source_id, language, meaning_text) VALUES (?, ?, ?, ?)",
                def_batch
            )
            conn.commit()
            print(f"  Migrated {len(rows):,} CVDICT entries.")
    else:
        print("[3/5] cvdict_characters not found, skipping.")

    # ── 4. Migrate sino_vn → sino_vietnamese ─────────────────────────
    if 'sino_vn' in existing:
        print("[4/5] Migrating sino_vn -> sino_vietnamese (bulk)...")

        simp_to_id = dict(cur.execute("SELECT simplified, id FROM characters").fetchall())
        trad_to_id = dict(cur.execute(
            "SELECT traditional, id FROM characters WHERE traditional IS NOT NULL"
        ).fetchall())

        sino_rows = cur.execute("SELECT char, pinyin, hanviet FROM sino_vn").fetchall()

        batch = []
        skipped = 0
        for char, pinyin, hanviet in sino_rows:
            char_id = simp_to_id.get(char) or trad_to_id.get(char)
            if not char_id:
                skipped += 1
                continue
            batch.append((char_id, hanviet, pinyin))

        conn.executemany(
            "INSERT INTO sino_vietnamese (character_id, hanviet, pinyin) VALUES (?, ?, ?)",
            batch
        )
        conn.commit()
        print(f"  Migrated {len(batch):,} rows, skipped {skipped} (char not in characters table).")
    else:
        print("[4/5] sino_vn not found, skipping.")

    # ── 5. Drop old tables ────────────────────────────────────────────
    print("[5/5] Dropping old tables...")
    cur.executescript("""
        DROP TABLE IF EXISTS cc_cedict_characters;
        DROP TABLE IF EXISTS cvdict_characters;
        DROP TABLE IF EXISTS sino_vn;
    """)
    conn.commit()
    print("  Dropped: cc_cedict_characters, cvdict_characters, sino_vn.")

    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA optimize")
    conn.close()
    print("\n[DONE] Migration complete!")


if __name__ == '__main__':
    migrate()
