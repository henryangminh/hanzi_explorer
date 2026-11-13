import json

from sqlmodel import Session, select

from app.models.character import Character
from app.models.flashcard import UserFlashcard
from app.models.wotd import WOTDHistory
from app.schemas.flashcard import FlashcardCardResponse
from app.services.character_lookup import batch_brief_lookup
from app.services.flashcard_service import build_card


def save_wotd(session: Session, user_id: int, date: str, chars: list[str]) -> bool:
    """Idempotently save today's WOTD. Returns True if saved, False if already exists."""
    existing = session.exec(
        select(WOTDHistory)
        .where(WOTDHistory.user_id == user_id)
        .where(WOTDHistory.date == date)
    ).first()
    if existing:
        return False
    session.add(WOTDHistory(
        user_id=user_id,
        date=date,
        chars_json=json.dumps(chars, ensure_ascii=False),
    ))
    session.commit()
    return True


def get_wotd_dates(session: Session, user_id: int) -> list[str]:
    records = session.exec(
        select(WOTDHistory)
        .where(WOTDHistory.user_id == user_id)
        .order_by(WOTDHistory.date.desc())
    ).all()
    return [r.date for r in records]


def get_wotd_for_date(
    session: Session,
    user_id: int,
    date: str,
) -> list[FlashcardCardResponse] | None:
    """Return flashcard entries for a specific saved WOTD date. Returns None if date not found."""
    record = session.exec(
        select(WOTDHistory)
        .where(WOTDHistory.user_id == user_id)
        .where(WOTDHistory.date == date)
    ).first()
    if not record:
        return None

    chars: list[str] = json.loads(record.chars_json)
    if not chars:
        return []

    # 1. Resolve characters
    char_rows = session.exec(
        select(Character).where(Character.simplified.in_(chars))
    ).all()
    char_by_simplified = {c.simplified: c for c in char_rows}
    char_ids = [c.id for c in char_rows]

    # 2. Pinyin readings + first CC-CEDICT / CVDICT definitions per character
    pinyins_by_char, cedict_by_char, cvdict_by_char = batch_brief_lookup(session, char_ids)

    # 3. User flashcard statuses
    flashcard_rows = session.exec(
        select(UserFlashcard)
        .where(UserFlashcard.user_id == user_id)
        .where(UserFlashcard.char.in_(chars))
    ).all()
    status_by_char = {fc.char: fc.status for fc in flashcard_rows}

    # 4. Build cards in the saved order (words missing from the dictionary are skipped)
    results = [
        build_card(session, ch, pinyins_by_char.get(c.id, []), cedict_by_char.get(c.id), cvdict_by_char.get(c.id), status_by_char.get(ch))
        for ch in chars
        if (c := char_by_simplified.get(ch))
    ]
    return results
