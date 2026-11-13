from typing import List, Optional
from pydantic import BaseModel


class RadicalSummary(BaseModel):
    id: int
    radical: str
    pinyin: str
    meaning_en: str
    meaning_vi: Optional[str]
    stroke_count: Optional[int]


class CharCard(BaseModel):
    char: str
    pinyin: str
    meaning_en: str
    stroke_count: Optional[int] = None


class RadicalCharsResponse(BaseModel):
    radical: str
    chars: List[CharCard]
