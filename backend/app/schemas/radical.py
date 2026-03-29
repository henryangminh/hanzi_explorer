from typing import List, Optional
from pydantic import BaseModel


class CompoundItem(BaseModel):
    char: str
    pinyin: str
    meaning_en: str
    note: Optional[str]


class RadicalDetail(BaseModel):
    id: int
    radical: str
    pinyin: str
    meaning_en: str
    meaning_vi: Optional[str]
    stroke_count: Optional[int]
    compounds: List[CompoundItem]


class RadicalSummary(BaseModel):
    id: int
    radical: str
    pinyin: str
    meaning_en: str
    meaning_vi: Optional[str]
    stroke_count: Optional[int]   # ← added, needed for sort
    compound_count: int
