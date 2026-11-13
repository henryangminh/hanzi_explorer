from typing import Optional
from sqlmodel import Field, SQLModel

from app.models import DICTIONARY_SCHEMA


class RadicalGroup(SQLModel, table=True):
    __tablename__ = "radical_groups"
    __table_args__ = {"schema": DICTIONARY_SCHEMA}

    id: Optional[int] = Field(default=None, primary_key=True)
    radical: str = Field(max_length=10)
    pinyin: str = Field(max_length=50)
    meaning_en: str
    meaning_vi: Optional[str] = None
    stroke_count: Optional[int] = None
