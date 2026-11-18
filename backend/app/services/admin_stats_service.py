from sqlmodel import Session, func, select

from app.models.flashcard import UserFlashcard
from app.models.notebook import Notebook, NotebookEntry
from app.models.review import ReviewItem
from app.models.search_history import SearchHistory
from app.models.user import User
from app.schemas.admin_stats import AdminStats, RecentSearch, UserActivity
from app.services import study_day_service, word_report_service

RECENT_SEARCHES = 10


def _count(session: Session, stmt) -> int:
    return session.exec(stmt).one()


def _status_counts(session: Session, user_id: int) -> dict[str, int]:
    rows = session.exec(
        select(UserFlashcard.status, func.count(UserFlashcard.id))
        .where(UserFlashcard.user_id == user_id)
        .group_by(UserFlashcard.status)
    ).all()
    return {status: count for status, count in rows}


def _activity(session: Session, user: User, today: str) -> UserActivity:
    counts = _status_counts(session, user.id)
    return UserActivity(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        studied_dates=study_day_service.get_studied_dates(session, user.id),
        learned_count=counts.get("learned", 0),
        not_learned_count=counts.get("not_learned", 0),
        review_due=_count(session, select(func.count(ReviewItem.id))
                          .where(ReviewItem.user_id == user.id, ReviewItem.due_date <= today)),
    )


def _recent_searches(session: Session) -> list[RecentSearch]:
    rows = session.exec(
        select(SearchHistory.char, SearchHistory.searched_at, User.display_name)
        .join(User, User.id == SearchHistory.user_id)
        .order_by(SearchHistory.searched_at.desc())
        .limit(RECENT_SEARCHES)
    ).all()
    return [RecentSearch(char=char, searched_at=at, display_name=name) for char, at, name in rows]


def get_stats(session: Session, today: str) -> AdminStats:
    """Overview for the admin dashboard; `today` is the admin's local date (for reviews due)."""
    users = session.exec(select(User).order_by(User.id)).all()
    learners = [u for u in users if not u.is_admin and not u.is_deleted]
    global_ids = select(Notebook.id).where(Notebook.type == "global")
    return AdminStats(
        total_users=len(users),
        active_users=sum(1 for u in users if u.is_active and not u.is_deleted),
        deleted_users=sum(1 for u in users if u.is_deleted),
        global_notebooks=_count(session, select(func.count(Notebook.id)).where(Notebook.type == "global")),
        global_entries=_count(session, select(func.count(NotebookEntry.id)).where(NotebookEntry.notebook_id.in_(global_ids))),
        open_reports=word_report_service.count_open(session),
        learners=[_activity(session, u, today) for u in learners],
        recent_searches=_recent_searches(session),
    )
