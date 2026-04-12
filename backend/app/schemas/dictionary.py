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


class CvdictEntry(BaseModel):
    id: int
    simplified: str
    traditional: Optional[str]
    pinyin: str
    meaning_vi: str
    radical: Optional[str]
    stroke_count: Optional[int]
    hsk_level: Optional[int]
    source_name: str


class DictLiteResponse(BaseModel):
    """CEDICT + CVDICT only — no external sources, no user note."""
    char: str
    cedict: List[CedictEntry]
    cvdict: List[CvdictEntry] = []
    sino_vn: List[str] = []     # Hán Việt readings, e.g. ["phán đoán"]
    hsk_tags: List[str] = []


class HanzipyData(BaseModel):
    components: List[str] = []  # Immediate structural components (decompose level 1)


class DictionaryResponse(BaseModel):
    char: str
    cedict: List[CedictEntry]   # list — multiple readings supported
    cvdict: List[CvdictEntry] = []
    external: List[ExternalSource]
    user_note: Optional[UserNoteResponse]
    hsk_tags: List[str] = []    # HSK notebook names from drkameleon DB
    sino_vn: List[str] = []     # Hán Việt readings, e.g. ["phán đoán"]
    hanzipy: Optional[HanzipyData] = None


class NoteUpsert(BaseModel):
    meaning_vi: Optional[str] = None
    note: Optional[str] = None
    tags: Optional[List[str]] = None
