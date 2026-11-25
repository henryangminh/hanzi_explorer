from typing import Annotated, List, Optional
from pydantic import BaseModel, StringConstraints

# Same limits as the note form
NoteTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
NoteDetail = Annotated[str, StringConstraints(strip_whitespace=True, max_length=250)]


class UserNoteResponse(BaseModel):
    id: int
    char: str
    title: str
    detail: Optional[str]
    updated_at: Optional[str] = None
    pinyin: str = ''
    sino_vn: List[str] = []


class NoteCreate(BaseModel):
    title: NoteTitle
    detail: Optional[NoteDetail] = None


class NoteUpdate(BaseModel):
    title: NoteTitle
    detail: Optional[NoteDetail] = None
