from typing import List

from fastapi import APIRouter, HTTPException, status
from app.core.deps import CurrentUser, DbSession
from app.schemas.radical import RadicalDetail, RadicalSummary
from app.services import radical_service

router = APIRouter(prefix="/radicals", tags=["radicals"])


@router.get("", response_model=List[RadicalSummary])
def list_radicals(current_user: CurrentUser, session: DbSession):
    return radical_service.list_radicals(session)


@router.get("/{radical}", response_model=RadicalDetail)
def get_radical(radical: str, current_user: CurrentUser, session: DbSession):
    result = radical_service.get_radical(session, radical)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Radical '{radical}' not found",
        )
    return result
