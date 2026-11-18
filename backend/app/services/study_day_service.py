from sqlalchemy import text
from sqlmodel import Session, select

from app.models.study_day import StudyDay


def mark_studied(session: Session, user_id: int, date: str) -> None:
    """Idempotently record that the user studied on `date`."""
    exists = session.exec(
        select(StudyDay).where(StudyDay.user_id == user_id).where(StudyDay.date == date)
    ).first()
    if not exists:
        session.add(StudyDay(user_id=user_id, date=date))
        session.commit()


def get_studied_dates(session: Session, user_id: int) -> list[str]:
    return list(session.exec(
        select(StudyDay.date).where(StudyDay.user_id == user_id).order_by(StudyDay.date.desc())
    ).all())


def backfill_from_wotd(session: Session) -> None:
    """Days recorded before study days existed count as studied (opening the words of the day was the old rule)."""
    session.execute(text("INSERT OR IGNORE INTO study_days (user_id, date) SELECT user_id, date FROM wotd_history"))
    session.commit()
