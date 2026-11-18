import json

from sqlmodel import Session, select

from app.models.flashcard import UserFlashcard
from app.models.wotd import WOTDHistory
from app.schemas.flashcard import FlashcardCardResponse
from app.services.flashcard_service import build_cards


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
    flashcard_rows = session.exec(
        select(UserFlashcard)
        .where(UserFlashcard.user_id == user_id)
        .where(UserFlashcard.char.in_(chars))
    ).all()
    return build_cards(session, chars, {fc.char: fc.status for fc in flashcard_rows})
