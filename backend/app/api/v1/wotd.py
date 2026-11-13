from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.flashcard import FlashcardCardResponse
from app.schemas.wotd import WOTDSaveRequest, WOTDSaveResponse
from app.services import wotd_service

router = APIRouter(prefix="/wotd", tags=["wotd"])


@router.post("", response_model=WOTDSaveResponse)
def save_wotd(data: WOTDSaveRequest, session: DbSession, user: CurrentUser):
    return WOTDSaveResponse(saved=wotd_service.save_wotd(session, user.id, data.date, data.chars))


@router.get("/dates", response_model=list[str])
def get_wotd_dates(session: DbSession, user: CurrentUser):
    return wotd_service.get_wotd_dates(session, user.id)


@router.get("/{date}", response_model=list[FlashcardCardResponse])
def get_wotd_for_date(date: str, session: DbSession, user: CurrentUser):
    result = wotd_service.get_wotd_for_date(session, user.id, date)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No WOTD for this date")
    return result
