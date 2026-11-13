from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserUpdate


def get_by_username(session: Session, username: str) -> Optional[User]:
    return session.exec(select(User).where(User.username == username, User.is_deleted == False)).first()


def authenticate(session: Session, username: str, password: str) -> Optional[User]:
    user = get_by_username(session, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def _change_password(user: User, current_password: Optional[str], new_password: str) -> None:
    """Users must confirm their current password to set a new one."""
    if not current_password:
        raise ValueError("Current password is required")
    if not verify_password(current_password, user.hashed_password):
        raise ValueError("Current password is incorrect")
    user.hashed_password = hash_password(new_password)


def update_user(session: Session, user: User, data: UserUpdate) -> User:
    if data.display_name is not None:
        user.display_name = data.display_name
    if data.language is not None:
        user.language = data.language
    if data.theme is not None:
        user.theme = data.theme
    if data.new_password:
        _change_password(user, data.current_password, data.new_password)

    user.updated_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
