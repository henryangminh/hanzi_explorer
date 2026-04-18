from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class WOTDHistory(SQLModel, table=True):
    __tablename__ = "wotd_history"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_wotd_user_date"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    date: str = Field(index=True)       # YYYY-MM-DD (local date sent by client)
    chars_json: str = Field()           # JSON array of simplified char strings
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
