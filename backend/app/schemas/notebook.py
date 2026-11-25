from datetime import datetime
from typing import Annotated, Literal, Optional
from pydantic import BaseModel, StringConstraints

# Same limits as the notebook form
NotebookName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
NotebookDescription = Annotated[str, StringConstraints(strip_whitespace=True, max_length=150)]


class NotebookCreate(BaseModel):
    name: NotebookName
    description: Optional[NotebookDescription] = None
    type: Literal["global", "private"] = "private"


class NotebookUpdate(BaseModel):
    name: Optional[NotebookName] = None
    description: Optional[NotebookDescription] = None
    sort_order: Optional[int] = None


class NotebookResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    type: str
    owner_id: Optional[int]
    sort_order: int
    entry_count: int
    learned_count: int = 0
    not_learned_count: int = 0
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


class NotebookEntryPreview(BaseModel):
    """Entry with brief CEDICT / CVDICT meanings for the notebook grid view."""
    id: int
    char: str
    traditional: Optional[str] = None
    added_at: str
    pinyins: list[str] = []
    sino_vn: list[str] = []
    cedict_brief: Optional[str] = None
    cvdict_brief: Optional[str] = None
    is_separable: bool = False


class AddEntryRequest(BaseModel):
    char: str


class AddEntriesRequest(BaseModel):
    chars: list[str]


class AddEntriesResponse(BaseModel):
    added: list[str]      # simplified headwords now in the notebook
    existing: list[str]   # already in the notebook
    unknown: list[str]    # not in the dictionary, so not added
