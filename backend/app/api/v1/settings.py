from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.schemas.settings import SettingsResponse, SettingsUpdate
from app.schemas.user import UserUpdate
from app.services import user_service

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
def get_settings(current_user: CurrentUser):
    return SettingsResponse(language=current_user.language, theme=current_user.theme)


@router.patch("", response_model=SettingsResponse)
def update_settings(body: SettingsUpdate, current_user: CurrentUser, session: DbSession):
    updated = user_service.update_user(
        session, current_user,
        UserUpdate(language=body.language, theme=body.theme),
    )
    return SettingsResponse(language=updated.language, theme=updated.theme)
