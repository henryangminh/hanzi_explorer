from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel


class UserPublic(BaseModel):
    id: int
    username: str
    display_name: str
    language: str
    theme: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    language: Optional[Literal["vi", "en"]] = None
    theme: Optional[Literal["light", "dark"]] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
