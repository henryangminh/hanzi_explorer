from typing import Optional
from sqlmodel import Field, SQLModel


class DictionarySource(SQLModel, table=True):
    """Registry of all imported dictionary sources."""
    __tablename__ = "dictionary_sources"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True, max_length=100)  # "CC-CEDICT"
    version: Optional[str] = Field(default=None, max_length=50) # "2026-03-27"
    entry_count: int = Field(default=0)
    imported_at: Optional[str] = Field(default=None)            # ISO datetime


class Character(SQLModel, table=True):
    """
    Single Source of Truth for each Chinese character/word.
    One row per unique simplified form.
    """
    __tablename__ = "characters"

    id: Optional[int] = Field(default=None, primary_key=True)
    simplified: str = Field(unique=True, index=True, max_length=10)
    traditional: Optional[str] = Field(default=None, max_length=10)
    radical: Optional[str] = Field(default=None, max_length=10)
    stroke_count: Optional[int] = None
    hsk_level: Optional[int] = Field(default=None, index=True)
    frequency: Optional[int] = None
    is_common: bool = Field(default=False)


class PinyinReading(SQLModel, table=True):
    """
    One row per (character, pinyin) reading.
    A character can have multiple readings (polyphones), e.g. 中: zhōng and zhòng.
    """
    __tablename__ = "pinyin_readings"

    id: Optional[int] = Field(default=None, primary_key=True)
    character_id: int = Field(foreign_key="characters.id", index=True)
    pinyin: str = Field(max_length=100, index=True)          # diacritic form, e.g. "zhōng"
    pinyin_numeric: Optional[str] = Field(default=None, max_length=100)  # numeric, e.g. "zhong1"
    tone: Optional[int] = None


class Definition(SQLModel, table=True):
    """
    Unified definitions from all sources (CC-CEDICT, CVDICT, DrKameleon, etc.).
    One row per (character, source, meaning entry).
    """
    __tablename__ = "definitions"

    id: Optional[int] = Field(default=None, primary_key=True)
    character_id: int = Field(foreign_key="characters.id", index=True)
    source_id: int = Field(foreign_key="dictionary_sources.id", index=True)
    language: str = Field(max_length=5)     # 'en', 'vi'
    meaning_text: str
    pos: Optional[str] = None               # Part of speech (from DrKameleon)


class ExternalCache(SQLModel, table=True):
    __tablename__ = "external_cache"

    id: Optional[int] = Field(default=None, primary_key=True)
    char: str = Field(index=True, max_length=10)
    source: str = Field(max_length=50)
    payload_json: str
    cached_at: str
