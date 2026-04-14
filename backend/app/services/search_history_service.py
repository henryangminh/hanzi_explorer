from datetime import datetime, timezone
from typing import List

from sqlmodel import Session, select

from app.models.search_history import SearchHistory
from app.schemas.search_history import SearchHistoryItem


def get_user_history(session: Session, user_id: int) -> List[SearchHistoryItem]:
    stmt = (
        select(SearchHistory)
        .where(SearchHistory.user_id == user_id)
        .order_by(SearchHistory.searched_at.desc())
    )
    rows = session.exec(stmt).all()
    return [SearchHistoryItem(id=r.id, char=r.char, searched_at=r.searched_at) for r in rows]


MAX_HISTORY_PER_USER = 20


def record_search(session: Session, user_id: int, char: str) -> None:
    """Upsert: if the same char was searched before, update the timestamp instead of inserting.
    Enforces a cap of MAX_HISTORY_PER_USER entries per user (oldest removed when exceeded)."""
    stmt = select(SearchHistory).where(
        SearchHistory.user_id == user_id,
        SearchHistory.char == char,
    )
    existing = session.exec(stmt).first()
    if existing:
        existing.searched_at = datetime.now(timezone.utc)
        session.add(existing)
    else:
        session.add(SearchHistory(user_id=user_id, char=char))
        session.flush()  # assign id so count query is accurate
        # Trim to cap: delete entries beyond the most-recent MAX_HISTORY_PER_USER
        all_stmt = (
            select(SearchHistory)
            .where(SearchHistory.user_id == user_id)
            .order_by(SearchHistory.searched_at.desc())
        )
        all_rows = session.exec(all_stmt).all()
        for old_row in all_rows[MAX_HISTORY_PER_USER:]:
            session.delete(old_row)
    session.commit()


def delete_all_history(session: Session, user_id: int) -> None:
    stmt = select(SearchHistory).where(SearchHistory.user_id == user_id)
    rows = session.exec(stmt).all()
    for row in rows:
        session.delete(row)
    session.commit()


def delete_selected_history(session: Session, user_id: int, chars: List[str]) -> None:
    if not chars:
        return
    stmt = select(SearchHistory).where(
        SearchHistory.user_id == user_id,
        SearchHistory.char.in_(chars),  # type: ignore[attr-defined]
    )
    rows = session.exec(stmt).all()
    for row in rows:
        session.delete(row)
    session.commit()
