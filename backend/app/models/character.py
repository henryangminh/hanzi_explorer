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


class CcCedictCharacter(SQLModel, table=True):
    """
    One row per CEDICT entry. A single simplified form may have
    multiple entries (different readings / tones / meanings).
    e.g. 中: zhōng (middle) AND zhòng (to hit a target)
    """
    __tablename__ = "cc_cedict_characters"

    id: Optional[int] = Field(default=None, primary_key=True)
    source_id: int = Field(foreign_key="dictionary_sources.id", index=True)
    simplified: str = Field(index=True, max_length=10)
    traditional: Optional[str] = Field(default=None, max_length=10)
    pinyin: str = Field(max_length=100)
    meaning_en: str
    radical: Optional[str] = Field(default=None, max_length=10)
    stroke_count: Optional[int] = None
    hsk_level: Optional[int] = None
    frequency: Optional[int] = None


class ExternalCache(SQLModel, table=True):
    __tablename__ = "external_cache"

    id: Optional[int] = Field(default=None, primary_key=True)
    char: str = Field(index=True, max_length=10)
    source: str = Field(max_length=50)
    payload_json: str
    cached_at: str
