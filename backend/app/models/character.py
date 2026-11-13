from typing import Optional
from sqlmodel import Field, SQLModel

from app.models import DICTIONARY_SCHEMA


class DictionarySource(SQLModel, table=True):
    """Registry of all imported dictionary sources."""
    __tablename__ = "dictionary_sources"
    __table_args__ = {"schema": DICTIONARY_SCHEMA}

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)                           # "CC-CEDICT"
    version: Optional[str] = Field(default=None, max_length=50) # "2026-03-27"
    entry_count: int = Field(default=0)
    imported_at: Optional[str] = Field(default=None)            # ISO datetime


class Character(SQLModel, table=True):
    """
    Single Source of Truth for each Chinese character/word.
    One row per unique simplified form.
    """
    __tablename__ = "characters"
    __table_args__ = {"schema": DICTIONARY_SCHEMA}

    id: Optional[int] = Field(default=None, primary_key=True)
    simplified: str = Field(max_length=10)
    traditional: Optional[str] = Field(default=None, max_length=10)
    radical: Optional[str] = Field(default=None, max_length=10)
    radical_traditional: Optional[str] = Field(default=None, max_length=10)
    stroke_count: Optional[int] = None
    stroke_count_traditional: Optional[int] = None
    frequency: Optional[int] = None
    is_separable: bool = Field(default=False)
    components: Optional[str] = Field(default=None)            # JSON array of component chars (simplified)
    components_traditional: Optional[str] = Field(default=None)  # JSON array of component chars (traditional)


class PinyinReading(SQLModel, table=True):
    """
    One row per (character, pinyin) reading.
    A character can have multiple readings (polyphones), e.g. 中: zhōng and zhòng.
    """
    __tablename__ = "pinyin_readings"
    __table_args__ = {"schema": DICTIONARY_SCHEMA}

    id: Optional[int] = Field(default=None, primary_key=True)
    character_id: int = Field(foreign_key=f"{DICTIONARY_SCHEMA}.characters.id")
    pinyin: str = Field(max_length=100)                                  # diacritic form, e.g. "zhōng"
    pinyin_numeric: Optional[str] = Field(default=None, max_length=100)  # numeric, e.g. "zhong1"


class Definition(SQLModel, table=True):
    """
    Unified definitions from all sources (CC-CEDICT, CVDICT, 现代汉语词典).
    One row per (character, source, meaning entry).
    """
    __tablename__ = "definitions"
    __table_args__ = {"schema": DICTIONARY_SCHEMA}

    id: Optional[int] = Field(default=None, primary_key=True)
    character_id: int = Field(foreign_key=f"{DICTIONARY_SCHEMA}.characters.id")
    source_id: int = Field(foreign_key=f"{DICTIONARY_SCHEMA}.dictionary_sources.id")
    language: str = Field(max_length=5)     # 'en', 'vi', 'zh'
    meaning_text: str
