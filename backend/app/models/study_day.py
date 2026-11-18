from typing import Optional
from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class StudyDay(SQLModel, table=True):
    """A day the user studied (marked a words-of-the-day or review card) — the streak is built from these."""
    __tablename__ = "study_days"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_study_day_user_date"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    date: str = Field()                 # YYYY-MM-DD (local date sent by client)
