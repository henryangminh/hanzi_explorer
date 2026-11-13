"""
One-time migration: split the legacy single-file hanzi.db into

  dictionary.db — reference data only (read-only for the backend)
  app.db        — users and everything they create (notes, notebooks, flashcards, history, cache)

What changes on the way:
  * notebook_entries.char_id (FK → characters.id) becomes notebook_entries.char (simplified text),
    so user data no longer depends on dictionary row ids and survives a dictionary rebuild.
  * Stub rows in `characters` (no definition, no reading, no Hán Việt — created by the app when a
    word missing from the dictionary was added to a notebook) are dropped from the dictionary.
  * drkameleon_characters / drkameleon_forms are renamed hsk_words / hsk_forms.
  * Dead data is left behind: lost_and_found, radical_compounds (empty), unused columns,
    user_notes.flashcard_status (already migrated to user_flashcards).
  * Corruption in the legacy file is repaired on the snapshot: indexes are rebuilt (REINDEX),
    external_cache rows with duplicated rowids are de-duplicated per (char, source), and cache rows
    that leaked into `definitions` (non-integer source_id) are dropped.

hanzi.db itself is only read (through a consistent snapshot), never modified.

Usage:
    python migration/split_database.py [path/to/hanzi.db] [--force]
"""
import sqlite3
import sys
import tempfile
from pathlib import Path

from common import APP_DB, DICTIONARY_DB, connect_dictionary

LEGACY_DB = APP_DB.parent / "hanzi.db"

# table → column list copied verbatim (target column names == source column names)
DICTIONARY_COPY = {
    "dictionary_sources": "id, name, version, entry_count, imported_at",
    "characters": "id, simplified, traditional, radical, radical_traditional, stroke_count, "
                  "stroke_count_traditional, frequency, is_separable, components, components_traditional",
    "pinyin_readings": "id, character_id, pinyin, pinyin_numeric",
    "definitions": "id, character_id, source_id, language, meaning_text",
    "sino_vietnamese": "id, character_id, hanviet, pinyin",
    "synonym_groups": "id, group_code",
    "synonym_members": "id, group_id, word",
    "antonyms": "id, word1, word2",
    "radical_groups": "id, radical, pinyin, meaning_en, meaning_vi, stroke_count",
    "hanzi_decomposition": "id, character, component",
}

# Characters that carry no dictionary data at all.
STUB_CHARACTERS = """
    SELECT c.id FROM src.characters c
    WHERE NOT EXISTS (SELECT 1 FROM src.definitions d WHERE d.character_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM src.pinyin_readings p WHERE p.character_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM src.sino_vietnamese s WHERE s.character_id = c.id)
"""

# app.db schema — mirrors the SQLModel definitions in backend/app/models (the backend owns app.db).
APP_SCHEMA = """
CREATE TABLE users (
    id INTEGER NOT NULL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    hashed_password VARCHAR NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    language VARCHAR(5) NOT NULL,
    theme VARCHAR(10) NOT NULL,
    is_active BOOLEAN NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);
CREATE UNIQUE INDEX ix_users_username ON users (username);

CREATE TABLE user_notes (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id),
    char VARCHAR(10) NOT NULL,
    title VARCHAR(200) NOT NULL,
    detail VARCHAR,
    pinyin VARCHAR(100),
    sino_vn_json VARCHAR,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);
CREATE INDEX ix_user_notes_user_id ON user_notes (user_id);
CREATE INDEX ix_user_notes_char ON user_notes (char);
CREATE INDEX ix_user_notes_user_updated ON user_notes (user_id, updated_at);

CREATE TABLE user_flashcards (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id),
    char VARCHAR(10) NOT NULL,
    status VARCHAR,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);
CREATE INDEX ix_user_flashcards_user_id ON user_flashcards (user_id);
CREATE INDEX ix_user_flashcards_char ON user_flashcards (char);

CREATE TABLE notebooks (
    id INTEGER NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    type VARCHAR(10) NOT NULL,
    owner_id INTEGER REFERENCES users (id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);
CREATE INDEX ix_notebooks_owner_id ON notebooks (owner_id);

CREATE TABLE notebook_entries (
    id INTEGER NOT NULL PRIMARY KEY,
    notebook_id INTEGER NOT NULL REFERENCES notebooks (id),
    char VARCHAR(10) NOT NULL,
    added_at DATETIME NOT NULL,
    CONSTRAINT uq_notebook_char UNIQUE (notebook_id, char)
);
CREATE INDEX ix_notebook_entries_notebook_id ON notebook_entries (notebook_id);
CREATE INDEX ix_notebook_entries_char ON notebook_entries (char);

CREATE TABLE search_history (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id),
    char VARCHAR(50) NOT NULL,
    searched_at DATETIME NOT NULL
);
CREATE INDEX ix_search_history_user_id ON search_history (user_id);
CREATE INDEX ix_search_history_char ON search_history (char);

CREATE TABLE wotd_history (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id),
    date VARCHAR NOT NULL,
    chars_json VARCHAR NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT uq_wotd_user_date UNIQUE (user_id, date)
);
CREATE INDEX ix_wotd_history_user_id ON wotd_history (user_id);
CREATE INDEX ix_wotd_history_date ON wotd_history (date);

CREATE TABLE external_cache (
    id INTEGER NOT NULL PRIMARY KEY,
    char VARCHAR(10) NOT NULL,
    source VARCHAR(50) NOT NULL,
    payload_json VARCHAR NOT NULL,
    cached_at VARCHAR NOT NULL
);
CREATE INDEX ix_external_cache_char ON external_cache (char);
"""

APP_COPY = {
    "users": "id, username, hashed_password, display_name, language, theme, is_active, is_admin, "
             "is_deleted, created_at, updated_at",
    "user_notes": "id, user_id, char, title, detail, pinyin, sino_vn_json, created_at, updated_at",
    "user_flashcards": "id, user_id, char, status, created_at, updated_at",
    "notebooks": "id, name, description, type, owner_id, COALESCE(sort_order, 0), created_at, updated_at",
    "search_history": "id, user_id, char, searched_at",
    "wotd_history": "id, user_id, date, chars_json, created_at",
}


def _snapshot(legacy: Path, dest: Path) -> None:
    """Consistent copy via the backup API (safe while the old server still has the DB open)."""
    src = sqlite3.connect(f"file:{legacy}?mode=ro", uri=True)
    dst = sqlite3.connect(dest)
    src.backup(dst)
    src.close()
    dst.execute("REINDEX")  # legacy indexes were missing entries; rebuild from table data
    dst.commit()
    dst.close()


def _check_integrity(conn: sqlite3.Connection, name: str) -> None:
    result = conn.execute("PRAGMA integrity_check").fetchone()[0]
    if result != "ok":
        raise SystemExit(f"[ERROR] {name} failed integrity_check: {result}")


def _count(conn: sqlite3.Connection, table: str) -> int:
    return conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


def build_dictionary(snapshot: Path) -> None:
    conn = connect_dictionary()
    conn.execute("PRAGMA foreign_keys = OFF")
    conn.execute("ATTACH DATABASE ? AS src", (str(snapshot),))
    stubs = {r[0] for r in conn.execute(STUB_CHARACTERS)}

    junk = conn.execute("SELECT COUNT(*) FROM src.definitions WHERE typeof(source_id) != 'integer'").fetchone()[0]
    for table, cols in DICTIONARY_COPY.items():
        where = {
            "characters": f" WHERE id NOT IN ({STUB_CHARACTERS})",
            # corruption left cache rows inside definitions (source_id = 'hvdic', 'wiktionary_en', ...)
            "definitions": " WHERE typeof(source_id) = 'integer'",
        }.get(table, "")
        conn.execute(f"INSERT INTO {table} ({cols}) SELECT {cols} FROM src.{table}{where}")

    conn.execute("""
        INSERT INTO hsk_words (id, simplified, radical, frequency, pos, levels)
        SELECT id, simplified, radical, frequency, pos, levels FROM src.drkameleon_characters
    """)
    conn.execute("""
        INSERT INTO hsk_forms (id, word_id, traditional, pinyin, pinyin_numeric, meanings, classifiers)
        SELECT id, character_id, traditional, pinyin, pinyin_numeric, meanings, classifiers
        FROM src.drkameleon_forms
    """)
    conn.commit()

    print("dictionary.db")
    for table in [*DICTIONARY_COPY, "hsk_words"]:
        src_table = "drkameleon_characters" if table == "hsk_words" else table
        expected = _count(conn, f"src.{src_table}") - {"characters": len(stubs), "definitions": junk}.get(table, 0)
        actual = _count(conn, table)
        status = "ok" if actual == expected else "MISMATCH"
        print(f"  {table:<22} {actual:>8,}  [{status}]")
        if actual != expected:
            raise SystemExit(f"[ERROR] {table}: expected {expected}, got {actual}")
    print(f"  (dropped {len(stubs)} stub characters with no dictionary data, {junk} corrupt definition rows)")

    conn.execute("DETACH DATABASE src")
    conn.execute("PRAGMA journal_mode = DELETE")  # read-only consumers need no -wal/-shm files
    conn.execute("ANALYZE")
    conn.execute("VACUUM")
    _check_integrity(conn, "dictionary.db")
    conn.close()


def build_app(snapshot: Path) -> None:
    conn = sqlite3.connect(APP_DB)
    conn.executescript(APP_SCHEMA)
    conn.execute("ATTACH DATABASE ? AS src", (str(snapshot),))

    for table, cols in APP_COPY.items():
        target_cols = cols.replace("COALESCE(sort_order, 0)", "sort_order")
        conn.execute(f"INSERT INTO {table} ({target_cols}) SELECT {cols} FROM src.{table}")

    conn.execute("""
        INSERT INTO notebook_entries (id, notebook_id, char, added_at)
        SELECT ne.id, ne.notebook_id, c.simplified, ne.added_at
        FROM src.notebook_entries ne
        JOIN src.characters c ON c.id = ne.char_id
    """)
    # Cache only. The legacy b-tree has out-of-order/duplicated rowids, so anything beyond a plain
    # table scan reports "malformed"; scan it and keep the newest row per (char, source) in Python.
    newest: dict[tuple[str, str], tuple] = {}
    for row in conn.execute(
        "SELECT char, source, payload_json, cached_at FROM src.external_cache NOT INDEXED"
    ).fetchall():
        key = (row[0], row[1])
        if key not in newest or row[3] > newest[key][3]:
            newest[key] = row
    conn.executemany(
        "INSERT INTO external_cache (char, source, payload_json, cached_at) VALUES (?, ?, ?, ?)",
        newest.values(),
    )
    conn.commit()

    print("app.db")
    for table in [*APP_COPY, "notebook_entries"]:
        expected, actual = _count(conn, f"src.{table}"), _count(conn, table)
        status = "ok" if actual == expected else "MISMATCH"
        print(f"  {table:<22} {actual:>8,}  [{status}]")
        if actual != expected:
            raise SystemExit(f"[ERROR] {table}: expected {expected}, got {actual}")
    print(f"  {'external_cache':<22} {_count(conn, 'external_cache'):>8,}  (de-duplicated)")

    conn.execute("DETACH DATABASE src")
    conn.execute("PRAGMA journal_mode = WAL")
    _check_integrity(conn, "app.db")
    conn.close()


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    legacy = Path(args[0]) if args else LEGACY_DB

    if not legacy.exists():
        raise SystemExit(f"[ERROR] Legacy database not found: {legacy}")
    for target in (DICTIONARY_DB, APP_DB):
        if target.exists():
            if not force:
                raise SystemExit(f"[ERROR] {target} already exists. Re-run with --force to overwrite.")
            for suffix in ("", "-wal", "-shm"):
                Path(f"{target}{suffix}").unlink(missing_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        snapshot = Path(tmp) / "snapshot.db"
        print(f"Snapshotting {legacy} ...")
        _snapshot(legacy, snapshot)
        build_dictionary(snapshot)
        build_app(snapshot)

    print(f"\nDone.\n  {DICTIONARY_DB}\n  {APP_DB}\n{legacy} was not modified; delete it once you've verified the app.")


if __name__ == "__main__":
    main()
