from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True, max_length=50)
    hashed_password: str
    display_name: str = Field(max_length=100)
    language: str = Field(default="vi", max_length=5)   # "vi" | "en"
    theme: str = Field(default="light", max_length=10)  # "light" | "dark"
    is_active: bool = Field(default=True)
    is_admin: bool = Field(default=False)
    is_deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
