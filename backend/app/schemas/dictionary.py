from typing import Any, Dict, List, Optional
from pydantic import BaseModel

from app.schemas.note import UserNoteResponse


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


class WordInfo(BaseModel):
    """A word with its pinyin and Hán Việt reading — used for synonym/antonym entries."""
    word: str
    pinyin: str = ''
    hanviet: str = ''


class DictLiteResponse(BaseModel):
    """CEDICT + CVDICT + XDHY only — no external sources, no user note."""
    char: str
    cedict: List[CedictEntry]
    cvdict: List[CvdictEntry] = []
    xdhy: List[XdhyEntry] = []
    sino_vn: List[str] = []     # Hán Việt readings, e.g. ["phán đoán"]
    sino_vn_by_reading: Dict[str, List[str]] = {}  # per reading (diacritic pinyin): 上 → {"shǎng": ["thướng"], "shàng": ["thượng"]}
    hsk_tags: List[str] = []
    synonyms: List[WordInfo] = []
    antonyms: List[WordInfo] = []


class HanzipyData(BaseModel):
    components: List[str] = []  # Immediate structural components (decompose level 1)


class DictionaryResponse(BaseModel):
    char: str
    cedict: List[CedictEntry]   # list — multiple readings supported
    cvdict: List[CvdictEntry] = []
    xdhy: List[XdhyEntry] = []
    external: List[ExternalSource]
    user_notes: List[UserNoteResponse] = []
    hsk_tags: List[str] = []    # names of global notebooks (HSK lists...) containing the word
    sino_vn: List[str] = []     # Hán Việt readings, e.g. ["phán đoán"]
    sino_vn_by_reading: Dict[str, List[str]] = {}  # per reading (diacritic pinyin): 上 → {"shǎng": ["thướng"], "shàng": ["thượng"]}
    hanzipy: Optional[HanzipyData] = None
    synonyms: List[WordInfo] = []
    antonyms: List[WordInfo] = []
