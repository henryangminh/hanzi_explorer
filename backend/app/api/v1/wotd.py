from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.deps import CurrentUser, DbSession
from app.services import wotd_service

router = APIRouter(prefix="/wotd", tags=["wotd"])


class WOTDSaveRequest(BaseModel):
    date: str        # YYYY-MM-DD (local date from client)
    chars: list[str]


@router.post("", status_code=200)
def save_wotd(data: WOTDSaveRequest, session: DbSession, user: CurrentUser):
    saved = wotd_service.save_wotd(session, user.id, data.date, data.chars)
    return {"saved": saved}


@router.get("/dates", response_model=list[str])
def get_wotd_dates(session: DbSession, user: CurrentUser):
    return wotd_service.get_wotd_dates(session, user.id)


@router.get("/{date}")
def get_wotd_for_date(date: str, session: DbSession, user: CurrentUser):
    result = wotd_service.get_wotd_for_date(session, user.id, date)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No WOTD for this date")
    return result
