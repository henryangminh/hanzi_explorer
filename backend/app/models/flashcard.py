from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class UserFlashcard(SQLModel, table=True):
    __tablename__ = "user_flashcards"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    char: str = Field(index=True, max_length=10)
    status: Optional[str] = Field(default=None)  # 'learned' or 'not_learned'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
