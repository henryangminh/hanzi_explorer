"""Permanent storage of crawled hvdic pages (no expiry): one row per (word, page kind)."""
import gzip
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_DB = Path(__file__).resolve().parents[2] / "crawled" / "hvdic.db"
HVDIC_DB = Path(os.environ.get("HVDIC_DB", DEFAULT_DB))

SCHEMA = """
CREATE TABLE IF NOT EXISTS pages (
    word        TEXT    NOT NULL,
    kind        TEXT    NOT NULL,   -- 'whv' (by Hán Việt) | 'wpy' (by pinyin)
    http_status INTEGER NOT NULL,
    found       INTEGER NOT NULL,   -- 0 when the site has no entry for the word
    html_gz     BLOB,               -- cleaned page content (gzip), kept to re-parse without re-crawling
    data        TEXT,               -- parsed JSON (parse.py)
    fetched_at  TEXT    NOT NULL,
    PRIMARY KEY (word, kind)
);

-- Glyph images ("Tự hình": Giáp cốt văn, Kim văn, …). A row is created when a page references
-- the image (fetched_at NULL = still to download) and completed once downloaded.
CREATE TABLE IF NOT EXISTS glyph_images (
    url          TEXT PRIMARY KEY,
    word         TEXT NOT NULL,
    label        TEXT,
    http_status  INTEGER,
    content      BLOB,
    content_type TEXT,
    fetched_at   TEXT
);
CREATE INDEX IF NOT EXISTS ix_glyph_images_word ON glyph_images (word);
"""


def connect() -> sqlite3.Connection:
    HVDIC_DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(HVDIC_DB)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.executescript(SCHEMA)
    return conn


def save_page(conn: sqlite3.Connection, word: str, kind: str, http_status: int, found: bool,
              content_html: str | None, data: dict | None) -> None:
    conn.execute(
        "INSERT OR REPLACE INTO pages (word, kind, http_status, found, html_gz, data, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            word, kind, http_status, int(found),
            gzip.compress(content_html.encode("utf-8")) if content_html else None,
            json.dumps(data, ensure_ascii=False) if data else None,
            datetime.now(timezone.utc).isoformat(),
        ),
    )
    conn.commit()


def add_image_refs(conn: sqlite3.Connection, word: str, refs: list[tuple[str, str]]) -> None:
    conn.executemany("INSERT OR IGNORE INTO glyph_images (url, word, label) VALUES (?, ?, ?)",
                     [(url, word, label) for url, label in refs])
    conn.commit()


def pending_images(conn: sqlite3.Connection, word: str) -> list[str]:
    return [u for (u,) in conn.execute("SELECT url FROM glyph_images WHERE word = ? AND fetched_at IS NULL", (word,))]


def save_image(conn: sqlite3.Connection, url: str, http_status: int, content: bytes | None, content_type: str) -> None:
    conn.execute(
        "UPDATE glyph_images SET http_status = ?, content = ?, content_type = ?, fetched_at = ? WHERE url = ?",
        (http_status, content, content_type, datetime.now(timezone.utc).isoformat(), url),
    )
    conn.commit()


def completed_words(conn: sqlite3.Connection, kinds: tuple[str, ...]) -> set[str]:
    """Words with every page kind stored and no glyph image left to download."""
    with_pages = {w for (w,) in conn.execute("SELECT word FROM pages GROUP BY word HAVING COUNT(*) = ?", (len(kinds),))}
    missing_images = {w for (w,) in conn.execute("SELECT DISTINCT word FROM glyph_images WHERE fetched_at IS NULL")}
    return with_pages - missing_images


def request_times(conn: sqlite3.Connection, since: datetime) -> list[float]:
    """Epoch times of the pages and images fetched since `since` (requests that count toward the site's limit)."""
    rows = conn.execute("""SELECT fetched_at FROM pages WHERE fetched_at > :since
                           UNION ALL SELECT fetched_at FROM glyph_images WHERE fetched_at > :since""",
                        {"since": since.isoformat()})
    return [datetime.fromisoformat(t).timestamp() for (t,) in rows]


def images_per_character(conn: sqlite3.Connection) -> float:
    """Average number of glyph images of a crawled single character."""
    chars, images = conn.execute("""SELECT COUNT(DISTINCT p.word), (SELECT COUNT(*) FROM glyph_images)
                                    FROM pages p WHERE length(p.word) = 1""").fetchone()
    return images / chars if chars else 0.0


def done_kinds(conn: sqlite3.Connection, word: str) -> set[str]:
    return {k for (k,) in conn.execute("SELECT kind FROM pages WHERE word = ?", (word,))}


def read_html(blob: bytes | None) -> str | None:
    return gzip.decompress(blob).decode("utf-8") if blob else None
