from typing import Optional
from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class ReviewItem(SQLModel, table=True):
    """A word the user marked "not learned", scheduled for spaced review."""
    __tablename__ = "review_items"
    __table_args__ = (UniqueConstraint("user_id", "char", name="uq_review_user_char"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    char: str = Field(max_length=10)
    interval_days: int = Field()        # current step of review_service.INTERVALS
    due_date: str = Field()             # YYYY-MM-DD (local date)
