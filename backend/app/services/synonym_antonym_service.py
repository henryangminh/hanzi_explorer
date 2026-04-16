"""
Synonym and antonym lookup service.

For a given Chinese word/character:
  - lookup_synonyms: returns all words that share a synonym group with it
  - lookup_antonyms: returns all antonym partners
  - _get_word_info: helper that resolves pinyin + Hán Việt for any word
"""

from sqlalchemy import text
from sqlmodel import Session

from app.schemas.dictionary import WordInfo


def _get_word_info(session: Session, word: str) -> WordInfo:
    """Get pinyin (diacritic) and Hán Việt for a word from the DB.

    Pinyin comes from pinyin_readings (first row for the word).
    Hán Việt is composed char-by-char from sino_vietnamese.
    """
    pinyin = ''
    hanviet = ''

    # ── Pinyin ────────────────────────────────────────────────
    row = session.execute(
        text("""
            SELECT pr.pinyin
            FROM characters c
            JOIN pinyin_readings pr ON pr.character_id = c.id
            WHERE c.simplified = :word
            ORDER BY pr.id
            LIMIT 1
        """),
        {"word": word},
    ).fetchone()
    if row:
        pinyin = row[0] or ''

    # ── Hán Việt — compose from each character ────────────────
    chars = list(word)
    parts: list[str] = []
    for ch in chars:
        sv = session.execute(
            text("""
                SELECT sv.hanviet
                FROM characters c
                JOIN sino_vietnamese sv ON sv.character_id = c.id
                WHERE c.simplified = :ch
                ORDER BY sv.id
                LIMIT 1
            """),
            {"ch": ch},
        ).fetchone()
        parts.append(sv[0] if sv else '')

    if all(parts):
        # Join individual readings, keeping the first candidate per char
        reading_parts = [p.split(',')[0].strip() for p in parts]
        hanviet = ' '.join(reading_parts)

    return WordInfo(word=word, pinyin=pinyin, hanviet=hanviet)


def lookup_synonyms(session: Session, char: str, limit: int = 30) -> list[WordInfo]:
    """Return up to `limit` synonyms for `char` (excluding the word itself)."""
    rows = session.execute(
        text("""
            SELECT DISTINCT sm2.word
            FROM synonym_members sm1
            JOIN synonym_members sm2 ON sm2.group_id = sm1.group_id
            WHERE sm1.word = :char AND sm2.word != :char
            LIMIT :lim
        """),
        {"char": char, "lim": limit},
    ).fetchall()

    return [_get_word_info(session, row[0]) for row in rows]


def lookup_antonyms(session: Session, char: str) -> list[WordInfo]:
    """Return all antonym partners for `char`."""
    rows = session.execute(
        text("""
            SELECT word2 FROM antonyms WHERE word1 = :char
            UNION
            SELECT word1 FROM antonyms WHERE word2 = :char
        """),
        {"char": char},
    ).fetchall()

    return [_get_word_info(session, row[0]) for row in rows]
