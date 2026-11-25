from datetime import datetime
from typing import Annotated, Literal, Optional
from pydantic import BaseModel, Field, StringConstraints

Username = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
DisplayName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
NewPassword = Annotated[str, Field(min_length=6, max_length=128)]  # same minimum as the forms


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
    username: Username
    display_name: DisplayName
    password: NewPassword
    is_admin: bool = False
    is_active: bool = True


class AdminUserUpdate(BaseModel):
    display_name: Optional[DisplayName] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    new_password: Optional[NewPassword] = None


class UserUpdate(BaseModel):
    display_name: Optional[DisplayName] = None
    language: Optional[Literal["vi", "en"]] = None
    theme: Optional[Literal["light", "dark"]] = None
    current_password: Optional[str] = None
    new_password: Optional[NewPassword] = None
