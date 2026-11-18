from fastapi import APIRouter, HTTPException, Request, status
from app.core import login_throttle
from app.core.deps import CurrentUser, DbSession
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserPublic
from app.services import user_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, session: DbSession):
    client = request.client.host if request.client else ""
    wait = login_throttle.retry_after(client, body.username)
    if wait:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed logins, try again later",
            headers={"Retry-After": str(wait)},
        )
    user = user_service.authenticate(session, body.username, body.password)
    if not user:
        login_throttle.record_failure(client, body.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    login_throttle.clear(client, body.username)
    # Checked after the password, so a locked account is only revealed to its owner
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserPublic)
def me(current_user: CurrentUser):
    return current_user
