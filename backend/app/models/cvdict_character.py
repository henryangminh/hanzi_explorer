"""
CVDICT model — Từ điển Hán-Việt CVDICT by Phong Phan
CC BY-SA 4.0 — https://github.com/ph0ngp/CVDICT

Cùng format với CC-CEDICT, chỉ khác phần meaning là tiếng Việt.
Table riêng biệt với cc_cedict_characters.
"""
from typing import Optional

from sqlmodel import Field, SQLModel


class CvdictCharacter(SQLModel, table=True):
    """
    One row per CVDICT entry.
    A single simplified form may have multiple entries (different readings/tones).
    e.g. 中 → zhōng (giữa) và zhòng (trúng)
    """
    __tablename__ = "cvdict_characters"

    id: Optional[int] = Field(default=None, primary_key=True)

    # FK sang dictionary_sources (cùng bảng với CC-CEDICT)
    source_id: int = Field(foreign_key="dictionary_sources.id", index=True)

    simplified: str = Field(index=True, max_length=50)
    traditional: Optional[str] = Field(default=None, max_length=50)
    pinyin: str = Field(max_length=200)          # numeric tone, e.g. "hen3"
    meaning_vi: str = Field(default="")          # nghĩa tiếng Việt (từ CVDICT)

    # Metadata — giống CC-CEDICT, để trống vì CVDICT không có
    radical: Optional[str] = Field(default=None, max_length=10)
    stroke_count: Optional[int] = Field(default=None)
    hsk_level: Optional[int] = Field(default=None)
