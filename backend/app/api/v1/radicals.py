from typing import List

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.radical import RadicalCharsResponse, RadicalSummary
from app.services import radical_service

router = APIRouter(prefix="/radicals", tags=["radicals"])


@router.get("", response_model=List[RadicalSummary])
def list_radicals(current_user: CurrentUser, session: DbSession):
    return radical_service.list_radicals(session)


@router.get("/{radical}/chars", response_model=RadicalCharsResponse)
def get_radical_chars(radical: str, current_user: CurrentUser, session: DbSession):
    """All characters that contain the radical, with their first CC-CEDICT reading and meaning."""
    result = radical_service.get_radical_chars(session, radical)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No data for radical '{radical}'")
    return result
