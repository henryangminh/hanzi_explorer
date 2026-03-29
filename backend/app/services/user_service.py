from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserUpdate


def get_by_username(session: Session, username: str) -> Optional[User]:
    return session.exec(select(User).where(User.username == username)).first()


def authenticate(session: Session, username: str, password: str) -> Optional[User]:
    user = get_by_username(session, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def create_user(session: Session, username: str, password: str, display_name: str) -> User:
    user = User(
        username=username,
        hashed_password=hash_password(password),
        display_name=display_name,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def update_user(session: Session, user: User, data: UserUpdate) -> User:
    if data.display_name is not None:
        user.display_name = data.display_name
    if data.language is not None:
        user.language = data.language
    if data.theme is not None:
        user.theme = data.theme
    if data.new_password and data.current_password:
        if not verify_password(data.current_password, user.hashed_password):
            raise ValueError("Current password is incorrect")
        user.hashed_password = hash_password(data.new_password)

    user.updated_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
