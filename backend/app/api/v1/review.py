from fastapi import APIRouter, Query, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.flashcard import FlashcardCardResponse
from app.schemas.review import DATE_PATTERN, ReviewAnswerRequest, ReviewScheduleRequest
from app.services import review_service

router = APIRouter(prefix="/review", tags=["review"])


@router.get("/due", response_model=list[FlashcardCardResponse])
def get_due(session: DbSession, user: CurrentUser, date: str = Query(pattern=DATE_PATTERN)):
    return review_service.get_due_cards(session, user.id, date)


@router.post("/schedule", status_code=status.HTTP_204_NO_CONTENT)
def schedule(data: ReviewScheduleRequest, session: DbSession, user: CurrentUser):
    review_service.schedule(session, user.id, data.char, data.date)


@router.delete("/schedule/{char}", status_code=status.HTTP_204_NO_CONTENT)
def unschedule(char: str, session: DbSession, user: CurrentUser):
    review_service.unschedule(session, user.id, char)


@router.post("/answer", status_code=status.HTTP_204_NO_CONTENT)
def answer(data: ReviewAnswerRequest, session: DbSession, user: CurrentUser):
    review_service.answer(session, user.id, data.char, data.date, data.remembered)
