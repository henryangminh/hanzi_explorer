import json
from datetime import date as Date, timedelta

from sqlmodel import Session, select

from app.models.flashcard import UserFlashcard
from app.models.review import ReviewItem
from app.models.wotd import WOTDHistory
from app.schemas.flashcard import FlashcardCardResponse
from app.services.flashcard_service import build_cards

INTERVALS = (1, 3, 7, 14, 30)  # days until the next review; remembered after the last one = learned for good


def _add_days(date: str, days: int) -> str:
    return (Date.fromisoformat(date) + timedelta(days=days)).isoformat()


def _get_item(session: Session, user_id: int, char: str) -> ReviewItem | None:
    return session.exec(
        select(ReviewItem).where(ReviewItem.user_id == user_id).where(ReviewItem.char == char)
    ).first()


def schedule(session: Session, user_id: int, char: str, date: str) -> None:
    """(Re)start a word's reviews: first one the day after `date`."""
    item = _get_item(session, user_id, char) or ReviewItem(user_id=user_id, char=char)
    item.interval_days = INTERVALS[0]
    item.due_date = _add_days(date, INTERVALS[0])
    session.add(item)
    session.commit()


def unschedule(session: Session, user_id: int, char: str) -> None:
    item = _get_item(session, user_id, char)
    if item:
        session.delete(item)
        session.commit()


def answer(session: Session, user_id: int, char: str, date: str, remembered: bool) -> None:
    """Remembered: wait for the next, longer interval (or stop after the last). Forgotten: start over."""
    item = _get_item(session, user_id, char)
    if not item:
        return
    if not remembered:
        schedule(session, user_id, char, date)
        return
    step = INTERVALS.index(item.interval_days) + 1 if item.interval_days in INTERVALS else 1
    if step == len(INTERVALS):
        unschedule(session, user_id, char)
        return
    item.interval_days = INTERVALS[step]
    item.due_date = _add_days(date, INTERVALS[step])
    session.add(item)
    session.commit()


def get_due_cards(session: Session, user_id: int, date: str) -> list[FlashcardCardResponse]:
    """Cards due on or before `date`, oldest first, unmarked so the user answers afresh."""
    chars = session.exec(
        select(ReviewItem.char)
        .where(ReviewItem.user_id == user_id)
        .where(ReviewItem.due_date <= date)
        .order_by(ReviewItem.due_date, ReviewItem.id)
    ).all()
    return build_cards(session, list(chars), {})


def backfill_from_wotd(session: Session, today: str) -> None:
    """Words of past days already marked "not learned" are due for review today."""
    marked = {(fc.user_id, fc.char) for fc in session.exec(
        select(UserFlashcard).where(UserFlashcard.status == "not_learned")
    ).all()}
    pending = set()
    for record in session.exec(select(WOTDHistory)).all():
        pending |= {(record.user_id, ch) for ch in json.loads(record.chars_json) if (record.user_id, ch) in marked}
    for user_id, char in pending:
        session.add(ReviewItem(user_id=user_id, char=char, interval_days=INTERVALS[0], due_date=today))
    session.commit()
