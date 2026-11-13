"""
Shared helpers for the migration / data pipeline.

Deliberately independent of backend/ code: this folder only knows the database files
it produces (dictionary.db) or seeds (app.db) and the schema in schema/dictionary.sql.
"""
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

MIGRATION_DIR = Path(__file__).resolve().parent
SOURCES_DIR = MIGRATION_DIR / "sources"
SCHEMA_FILE = MIGRATION_DIR / "schema" / "dictionary.sql"

_BACKEND_DATA = MIGRATION_DIR.parent / "backend" / "data"
DICTIONARY_DB = Path(os.environ.get("DICTIONARY_DB", _BACKEND_DATA / "dictionary.db"))
APP_DB = Path(os.environ.get("APP_DB", _BACKEND_DATA / "app.db"))


def connect_dictionary() -> sqlite3.Connection:
    """Open (creating if needed) dictionary.db and make sure the schema exists."""
    DICTIONARY_DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DICTIONARY_DB)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA_FILE.read_text(encoding="utf-8"))
    return conn


def require_source(path: Path) -> Path:
    if not path.exists():
        raise SystemExit(f"[ERROR] Source file not found: {path}")
    return path


def upsert_source(conn: sqlite3.Connection, name: str) -> int:
    """Return the id of a dictionary_sources row and clear its old definitions (idempotent re-import)."""
    conn.execute("INSERT OR IGNORE INTO dictionary_sources (name) VALUES (?)", (name,))
    source_id = conn.execute("SELECT id FROM dictionary_sources WHERE name = ?", (name,)).fetchone()[0]
    conn.execute("DELETE FROM definitions WHERE source_id = ?", (source_id,))
    return source_id


def finish_source(conn: sqlite3.Connection, source_id: int, entry_count: int) -> None:
    now = datetime.now(timezone.utc)
    conn.execute(
        "UPDATE dictionary_sources SET entry_count = ?, version = ?, imported_at = ? WHERE id = ?",
        (entry_count, now.strftime("%Y-%m-%d"), now.isoformat(), source_id),
    )


class CharacterIndex:
    """In-memory simplified → id map so importers don't query per line."""

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.ids: dict[str, int] = {}
        self.has_trad: set[int] = set()
        for cid, simp, trad in conn.execute("SELECT id, simplified, traditional FROM characters"):
            self.ids[simp] = cid
            if trad:
                self.has_trad.add(cid)

    def get_or_create(self, simplified: str, traditional: str | None) -> int:
        cid = self.ids.get(simplified)
        if cid is None:
            cid = self.conn.execute(
                "INSERT INTO characters (simplified, traditional) VALUES (?, ?)", (simplified, traditional)
            ).lastrowid
            self.ids[simplified] = cid
            if traditional:
                self.has_trad.add(cid)
        elif traditional and cid not in self.has_trad:
            self.conn.execute("UPDATE characters SET traditional = ? WHERE id = ?", (traditional, cid))
            self.has_trad.add(cid)
        return cid


# ── Pinyin: numeric tone → diacritic (kept in sync with backend/app/core/pinyin.py) ──

_TONE_MAP: dict[str, list[str]] = {
    'a': ['ā', 'á', 'ǎ', 'à', 'a'],
    'e': ['ē', 'é', 'ě', 'è', 'e'],
    'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
    'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
    'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
    'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
    'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
}
_VOWELS = 'aeiouüv'


def _place_tone(syllable: str, tone: int) -> str:
    if tone == 5:
        return syllable
    for v in ('a', 'e'):
        if v in syllable:
            return syllable.replace(v, _TONE_MAP[v][tone - 1], 1)
    if 'ou' in syllable:
        return syllable.replace('o', _TONE_MAP['o'][tone - 1], 1)
    last_idx, last_ch = -1, ''
    for idx, ch in enumerate(syllable):
        if ch in _VOWELS:
            last_idx, last_ch = idx, ch
    if last_idx >= 0:
        return syllable[:last_idx] + _TONE_MAP[last_ch][tone - 1] + syllable[last_idx + 1:]
    return syllable


def numeric_to_diacritic(pinyin: str) -> str:
    """'ke3 yi3' → 'kě yǐ'"""
    result = []
    for syllable in pinyin.strip().split():
        syllable = syllable.strip('[]')
        if syllable and syllable[-1].isdigit():
            result.append(_place_tone(syllable[:-1], int(syllable[-1])))
        else:
            result.append(syllable)
    return ' '.join(result)
