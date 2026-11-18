import re
from datetime import datetime, timezone

from sqlalchemy import bindparam, text
from sqlmodel import Session, select

from app.models.character import Character

from app.core.cedict_utils import clean_meaning
from app.core.pinyin import numeric_to_diacritic
from app.models.flashcard import UserFlashcard
from app.models.notebook import NotebookEntry
from app.schemas.flashcard import FlashcardCardResponse, FlashcardReading, FlashcardStatusUpdate
from app.services.character_lookup import batch_brief_lookup, get_brief_source_ids
from app.services.sino_vn_service import compose_from_db

_CEDICT_SKIP = re.compile(
    r'^(old variant of|variant of|surname\b|CL:)',
    re.IGNORECASE,
)
_CVDICT_SKIP = re.compile(
    r'^(biến thể cũ|họ\b)',
    re.IGNORECASE,
)


def _cedict_brief(raw: str | None) -> str | None:
    if not raw:
        return None
    cleaned = clean_meaning(raw)
    for part in cleaned.split(";"):
        part = part.strip()
        if part and not _CEDICT_SKIP.match(part):
            return part
    return None


def _cvdict_brief(raw: str | None) -> str | None:
    if not raw:
        return None
    for part in raw.split("/"):
        part = part.strip()
        if part and not _CVDICT_SKIP.match(part):
            return part
    return None


def _distinct_readings(pinyins_numeric: list[str]) -> list[str]:
    """Readings without case duplicates: CC-CEDICT lists surname readings separately ("Zhong1"
    next to "zhong1"); keep one, preferring the lowercase form. Order is preserved."""
    by_key: dict[str, str] = {}
    for p in pinyins_numeric:
        key = p.lower()
        if key not in by_key or p == key:  # first seen, or the lowercase form replacing a capitalized one
            by_key[key] = p
    return list(by_key.values())


def card_readings(session: Session, word: str, pinyins_numeric: list[str]) -> list[FlashcardReading]:
    """Each reading of the word with its Hán Việt (上: shǎng · thướng, shàng · thượng)."""
    readings = []
    for numeric in _distinct_readings(pinyins_numeric):
        sino_vn = compose_from_db(session, word, numeric)
        readings.append(FlashcardReading(pinyin=numeric_to_diacritic(numeric), sino_vn=sino_vn[0] if sino_vn else None))
    return readings


def build_card(
    session: Session, word: str, pinyins_numeric: list[str],
    cedict_raw: str | None, cvdict_raw: str | None, status: str | None,
) -> FlashcardCardResponse:
    return FlashcardCardResponse(
        char=word,
        readings=card_readings(session, word, pinyins_numeric),
        cedict_brief=_cedict_brief(cedict_raw),
        cvdict_brief=_cvdict_brief(cvdict_raw),
        status=status,
    )


def build_cards(session: Session, words: list[str], status_by_word: dict[str, str | None]) -> list[FlashcardCardResponse]:
    """Cards for the given words in order (words missing from the dictionary are skipped)."""
    if not words:
        return []
    char_by_word = {c.simplified: c for c in session.exec(select(Character).where(Character.simplified.in_(words))).all()}
    pinyins_by_char, cedict_by_char, cvdict_by_char = batch_brief_lookup(session, [c.id for c in char_by_word.values()])
    return [
        build_card(session, w, pinyins_by_char.get(c.id, []), cedict_by_char.get(c.id), cvdict_by_char.get(c.id), status_by_word.get(w))
        for w in words
        if (c := char_by_word.get(w))
    ]


# Raw SQL: CTEs + GROUP_CONCAT across app.db and the attached dictionary.db are much simpler
# (and faster) than the ORM equivalent. Dictionary tables are schema-qualified with "dictionary.".
#
# Both queries share everything after `source_chars` (char, char_id, status): first CC-CEDICT and
# CVDICT definition plus all distinct readings of each char.
_CARD_DETAILS = """
    en_min AS (
        SELECT character_id, MIN(id) AS min_id
        FROM dictionary.definitions
        WHERE source_id = :cedict_id AND language = 'en'
          AND character_id IN (SELECT char_id FROM source_chars)
        GROUP BY character_id
    ),
    vi_min AS (
        SELECT character_id, MIN(id) AS min_id
        FROM dictionary.definitions
        WHERE source_id = :cvdict_id AND language = 'vi'
          AND character_id IN (SELECT char_id FROM source_chars)
        GROUP BY character_id
    ),
    py AS (
        SELECT pr.character_id,
               GROUP_CONCAT(pr.pinyin_numeric, '|||') AS pinyins_raw
        FROM (
            SELECT character_id, pinyin_numeric
            FROM dictionary.pinyin_readings
            WHERE character_id IN (SELECT char_id FROM source_chars)
            GROUP BY character_id, pinyin_numeric
            ORDER BY character_id, MIN(id)
        ) pr
        GROUP BY pr.character_id
    )
    SELECT sc.char, py.pinyins_raw,
           en_d.meaning_text, vi_d.meaning_text, sc.status
    FROM source_chars sc
    LEFT JOIN en_min   ON en_min.character_id = sc.char_id
    LEFT JOIN dictionary.definitions en_d ON en_d.id = en_min.min_id
    LEFT JOIN vi_min   ON vi_min.character_id = sc.char_id
    LEFT JOIN dictionary.definitions vi_d ON vi_d.id = vi_min.min_id
    LEFT JOIN py       ON py.character_id      = sc.char_id
"""

# Random sample of words from the given notebooks (words missing from the dictionary included).
_SAMPLED_SQL = text("""
    WITH sampled AS (
        SELECT DISTINCT char
        FROM notebook_entries
        WHERE notebook_id IN :notebook_ids
        ORDER BY RANDOM()
        LIMIT :count
    ),
    source_chars AS (
        SELECT s.char, c.id AS char_id, uf.status
        FROM sampled s
        LEFT JOIN dictionary.characters c ON c.simplified = s.char
        LEFT JOIN user_flashcards uf ON uf.user_id = :user_id AND uf.char = s.char
    ),
""" + _CARD_DETAILS).bindparams(bindparam("notebook_ids", expanding=True))

# Every word the user has marked learned / not learned.
_MARKED_SQL = text("""
    WITH source_chars AS (
        SELECT uf.char, c.id AS char_id, uf.status
        FROM user_flashcards uf
        JOIN dictionary.characters c ON c.simplified = uf.char
        WHERE uf.user_id = :user_id AND uf.status IS NOT NULL
    ),
""" + _CARD_DETAILS + """
    ORDER BY sc.status, sc.char
""")


def _query_cards(session: Session, sql, params: dict) -> list[FlashcardCardResponse]:
    cedict_id, cvdict_id = get_brief_source_ids(session)
    rows = session.execute(sql, {**params, "cedict_id": cedict_id, "cvdict_id": cvdict_id}).fetchall()
    return [
        build_card(session, word, pinyins_raw.split("|||") if pinyins_raw else [], cedict_raw, cvdict_raw, status)
        for word, pinyins_raw, cedict_raw, cvdict_raw, status in rows
    ]


def get_flashcards(session: Session, notebook_ids: list[int], user_id: int, count: int) -> list[FlashcardCardResponse]:
    return _query_cards(session, _SAMPLED_SQL, {"notebook_ids": notebook_ids, "count": count, "user_id": user_id})


def get_marked_flashcards(session: Session, user_id: int) -> list[FlashcardCardResponse]:
    return _query_cards(session, _MARKED_SQL, {"user_id": user_id})


def get_flashcard_statuses(
    session: Session,
    user_id: int,
    chars: list[str],
) -> dict[str, str | None]:
    if not chars:
        return {}
    rows = session.exec(
        select(UserFlashcard)
        .where(UserFlashcard.user_id == user_id)
        .where(UserFlashcard.char.in_(chars))
    ).all()
    return {r.char: r.status for r in rows}


def get_notebook_statuses(session: Session, user_id: int, notebook_id: int) -> dict[str, str | None]:
    """The user's statuses of every word in a notebook (words never marked are left out)."""
    rows = session.exec(
        select(UserFlashcard.char, UserFlashcard.status)
        .join(NotebookEntry, NotebookEntry.char == UserFlashcard.char)
        .where(NotebookEntry.notebook_id == notebook_id)
        .where(UserFlashcard.user_id == user_id)
    ).all()
    return {char: status for char, status in rows}


def update_flashcard_status(
    session: Session,
    user_id: int,
    data: FlashcardStatusUpdate,
) -> None:
    fc = session.exec(
        select(UserFlashcard)
        .where(UserFlashcard.user_id == user_id)
        .where(UserFlashcard.char == data.char)
    ).first()

    if fc:
        fc.status = data.status
        fc.updated_at = datetime.now(timezone.utc)
        session.add(fc)
        session.commit()
    elif data.status is not None:
        session.add(UserFlashcard(user_id=user_id, char=data.char, status=data.status))
        session.commit()
