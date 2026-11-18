from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class WordReport(SQLModel, table=True):
    """A user's report of a wrong or missing dictionary entry, for an admin to look into."""
    __tablename__ = "word_reports"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    char: str = Field(max_length=50)
    message: str = Field(max_length=1000)
    status: str = Field(default="open", max_length=10, index=True)  # "open" | "resolved"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
