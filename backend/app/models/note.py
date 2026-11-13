from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Index
from sqlmodel import Field, SQLModel


class UserNote(SQLModel, table=True):
    __tablename__ = "user_notes"
    __table_args__ = (
        # Compound index to avoid temp B-tree sort on the main notes query
        Index("ix_user_notes_user_updated", "user_id", "updated_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    char: str = Field(index=True, max_length=10)
    title: str = Field(max_length=200)
    detail: Optional[str] = None
    pinyin: Optional[str] = Field(default=None, max_length=100)
    sino_vn_json: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
