from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class UserNote(SQLModel, table=True):
    __tablename__ = "user_notes"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    char: str = Field(index=True, max_length=10)
    title: str = Field(max_length=200)
    detail: Optional[str] = None
    flashcard_status: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserFlashcard(SQLModel, table=True):
    __tablename__ = "user_flashcards"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    char: str = Field(index=True, max_length=10)
    status: Optional[str] = Field(default=None)  # 'learned' or 'not_learned'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RadicalGroup(SQLModel, table=True):
    __tablename__ = "radical_groups"

    id: Optional[int] = Field(default=None, primary_key=True)
    radical: str = Field(unique=True, index=True, max_length=10)
    pinyin: str = Field(max_length=50)
    meaning_en: str
    meaning_vi: Optional[str] = None
    stroke_count: Optional[int] = None


class RadicalCompound(SQLModel, table=True):
    __tablename__ = "radical_compounds"

    id: Optional[int] = Field(default=None, primary_key=True)
    radical_id: int = Field(foreign_key="radical_groups.id", index=True)
    # FK to cc_cedict_characters — using the first entry id for a given simplified
    char_simplified: str = Field(index=True, max_length=10)
    note: Optional[str] = None


class HanziDecomposition(SQLModel, table=True):
    __tablename__ = "hanzi_decomposition"

    id: Optional[int] = Field(default=None, primary_key=True)
    character: str = Field(index=True, max_length=4)
    component: str = Field(index=True, max_length=4)
