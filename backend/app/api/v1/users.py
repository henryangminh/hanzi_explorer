from fastapi import APIRouter, HTTPException, status
from app.core.deps import CurrentUser, DbSession
from app.schemas.user import UserPublic, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/profile", response_model=UserPublic)
def get_profile(current_user: CurrentUser):
    return current_user


@router.patch("/profile", response_model=UserPublic)
def update_profile(body: UserUpdate, current_user: CurrentUser, session: DbSession):
    try:
        updated = user_service.update_user(session, current_user, body)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return updated
