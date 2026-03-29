from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class CedictEntry(BaseModel):
    id: int
    simplified: str
    traditional: Optional[str]
    pinyin: str
    meaning_en: str
    radical: Optional[str]
    stroke_count: Optional[int]
    hsk_level: Optional[int]
    source_name: str   # "CC-CEDICT"


class ExternalSource(BaseModel):
    source: str
    label: str
    data: Dict[str, Any]
    from_cache: bool = False


class UserNoteResponse(BaseModel):
    id: int
    char: str
    meaning_vi: Optional[str]
    note: Optional[str]
    tags: List[str]


class DictionaryResponse(BaseModel):
    char: str
    cedict: List[CedictEntry]   # list — multiple readings supported
    external: List[ExternalSource]
    user_note: Optional[UserNoteResponse]


class NoteUpsert(BaseModel):
    meaning_vi: Optional[str] = None
    note: Optional[str] = None
    tags: Optional[List[str]] = None
