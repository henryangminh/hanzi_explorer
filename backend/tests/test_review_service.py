from sqlmodel import select

from app.models.flashcard import UserFlashcard
from app.models.review import ReviewItem
from app.services import review_service


def _item(session, user_id, char):
    return session.exec(select(ReviewItem).where(ReviewItem.user_id == user_id, ReviewItem.char == char)).first()


def test_schedule_is_due_the_next_day(session, make_user):
    u = make_user("a")
    review_service.schedule(session, u.id, "学", "2026-11-18")
    item = _item(session, u.id, "学")
    assert (item.interval_days, item.due_date) == (1, "2026-11-19")


def test_remembering_walks_through_every_interval_then_stops(session, make_user):
    u = make_user("a")
    review_service.schedule(session, u.id, "学", "2026-11-18")
    seen = []
    for _ in review_service.INTERVALS[1:]:
        review_service.answer(session, u.id, "学", "2026-11-18", remembered=True)
        seen.append(_item(session, u.id, "学").interval_days)
    assert seen == [3, 7, 14, 30]
    assert _item(session, u.id, "学").due_date == "2026-12-18"

    review_service.answer(session, u.id, "学", "2026-11-18", remembered=True)
    assert _item(session, u.id, "学") is None  # learned for good


def test_forgetting_starts_over(session, make_user):
    u = make_user("a")
    review_service.schedule(session, u.id, "学", "2026-11-18")
    review_service.answer(session, u.id, "学", "2026-11-18", remembered=True)
    review_service.answer(session, u.id, "学", "2026-11-21", remembered=False)
    item = _item(session, u.id, "学")
    assert (item.interval_days, item.due_date) == (1, "2026-11-22")


def test_answer_for_an_unscheduled_word_does_nothing(session, make_user):
    u = make_user("a")
    review_service.answer(session, u.id, "学", "2026-11-18", remembered=True)
    assert _item(session, u.id, "学") is None


def test_schedules_are_per_user(session, make_user):
    a, b = make_user("a"), make_user("b")
    review_service.schedule(session, a.id, "学", "2026-11-18")
    review_service.unschedule(session, b.id, "学")
    assert _item(session, a.id, "学") is not None


def test_backfill_schedules_unscheduled_not_learned_words_once(session, make_user):
    u = make_user("a")
    session.add_all([
        UserFlashcard(user_id=u.id, char="学", status="not_learned"),
        UserFlashcard(user_id=u.id, char="习", status="learned"),
        UserFlashcard(user_id=u.id, char="书", status="not_learned"),
    ])
    session.commit()
    review_service.schedule(session, u.id, "书", "2026-11-10")  # already scheduled: left alone

    review_service.backfill_not_learned(session, "2026-11-18")
    review_service.backfill_not_learned(session, "2026-11-18")

    items = session.exec(select(ReviewItem).order_by(ReviewItem.char)).all()
    assert [(i.char, i.due_date) for i in items] == [("书", "2026-11-11"), ("学", "2026-11-18")]
