from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel


class UserPublic(BaseModel):
    id: int
    username: str
    display_name: str
    language: str
    theme: str
    is_admin: bool
    is_active: bool
    is_deleted: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserCreate(BaseModel):
    username: str
    display_name: str
    password: str
    is_admin: bool = False
    is_active: bool = True


class AdminUserUpdate(BaseModel):
    display_name: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    new_password: Optional[str] = None


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    language: Optional[Literal["vi", "en"]] = None
    theme: Optional[Literal["light", "dark"]] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
