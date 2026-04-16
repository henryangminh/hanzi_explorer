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
    is_separable: bool = False


class ExternalSource(BaseModel):
    source: str
    label: str
    data: Dict[str, Any]
    from_cache: bool = False


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
    is_separable: bool = False


class XdhyDefItem(BaseModel):
    pos: Optional[str]
    definition: str
    examples: List[str]
    is_sub: bool = False


class XdhyEntry(BaseModel):
    id: int
    simplified: str
    traditional: Optional[str]
    pinyin: str
    defs: List[XdhyDefItem]
    source_name: str


class DictLiteResponse(BaseModel):
    """CEDICT + CVDICT + XDHY only — no external sources, no user note."""
    char: str
    cedict: List[CedictEntry]
    cvdict: List[CvdictEntry] = []
    xdhy: List[XdhyEntry] = []
    sino_vn: List[str] = []     # Hán Việt readings, e.g. ["phán đoán"]
    hsk_tags: List[str] = []


class HanzipyData(BaseModel):
    components: List[str] = []  # Immediate structural components (decompose level 1)


class DictionaryResponse(BaseModel):
    char: str
    cedict: List[CedictEntry]   # list — multiple readings supported
    cvdict: List[CvdictEntry] = []
    xdhy: List[XdhyEntry] = []
    external: List[ExternalSource]
    user_notes: List[UserNoteResponse] = []
    hsk_tags: List[str] = []    # HSK notebook names from drkameleon DB
    sino_vn: List[str] = []     # Hán Việt readings, e.g. ["phán đoán"]
    hanzipy: Optional[HanzipyData] = None
