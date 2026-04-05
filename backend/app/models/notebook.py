from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Notebook(SQLModel, table=True):
    __tablename__ = "notebooks"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    # "global" = visible to all, only admin can edit
    # "private" = only owner can see and edit
    type: str = Field(default="private", max_length=10)
    # null means system-created global notebook
    owner_id: Optional[int] = Field(default=None, foreign_key="users.id", index=True)
    sort_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NotebookEntry(SQLModel, table=True):
    __tablename__ = "notebook_entries"
    __table_args__ = (
        UniqueConstraint("notebook_id", "char", name="uq_notebook_char"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    notebook_id: int = Field(foreign_key="notebooks.id", index=True)
    char: str = Field(index=True, max_length=50)
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
