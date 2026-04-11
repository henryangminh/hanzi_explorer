from datetime import datetime, timezone
from typing import List

from sqlmodel import Session, select

from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import AdminUserCreate, AdminUserUpdate


def get_users(session: Session) -> List[User]:
    return session.exec(select(User)).all()


def get_user_by_id(session: Session, user_id: int) -> User | None:
    return session.get(User, user_id)


def create_user(session: Session, data: AdminUserCreate) -> User:
    if session.exec(select(User).where(User.username == data.username)).first():
        raise ValueError("Username already exists")
        
    user = User(
        username=data.username,
        display_name=data.display_name,
        hashed_password=hash_password(data.password),
        is_admin=data.is_admin,
        is_active=data.is_active,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def update_user(session: Session, user: User, data: AdminUserUpdate) -> User:
    if data.display_name is not None:
        user.display_name = data.display_name
    if data.is_admin is not None:
        user.is_admin = data.is_admin
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.new_password:
        user.hashed_password = hash_password(data.new_password)

    user.updated_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def soft_delete_user(session: Session, user: User) -> User:
    user.is_deleted = True
    user.updated_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

def restore_user(session: Session, user: User) -> User:
    user.is_deleted = False
    user.updated_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
