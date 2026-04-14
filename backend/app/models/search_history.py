from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class SearchHistory(SQLModel, table=True):
    __tablename__ = "search_history"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    char: str = Field(index=True, max_length=50)
    searched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
