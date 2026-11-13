from typing import List, Optional
from pydantic import BaseModel


class UserNoteResponse(BaseModel):
    id: int
    char: str
    title: str
    detail: Optional[str]
    updated_at: Optional[str] = None
    pinyin: str = ''
    sino_vn: List[str] = []


class NoteCreate(BaseModel):
    title: str
    detail: Optional[str] = None


class NoteUpdate(BaseModel):
    title: str
    detail: Optional[str] = None
