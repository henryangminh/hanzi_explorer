from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel


class NotebookCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: Literal["global", "private"] = "private"


class NotebookUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class NotebookResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    type: str
    owner_id: Optional[int]
    entry_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotebookEntryResponse(BaseModel):
    id: int
    notebook_id: int
    char: str
    added_at: datetime

    class Config:
        from_attributes = True


class NotebookDetail(NotebookResponse):
    entries: list[NotebookEntryResponse]


class AddEntryRequest(BaseModel):
    char: str
