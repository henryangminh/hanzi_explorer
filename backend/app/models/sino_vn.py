from typing import Optional
from sqlmodel import Field, SQLModel

from app.models import DICTIONARY_SCHEMA


class SinoVietnamese(SQLModel, table=True):
    """
    Sino-Vietnamese (Hán Việt) readings for Chinese characters.
    One row per (character, pinyin) pair — a character can have multiple rows
    if it has multiple pronunciations (e.g. 上: shang3 → thướng, shang4 → thượng).
    """
    __tablename__ = "sino_vietnamese"
    __table_args__ = {"schema": DICTIONARY_SCHEMA}

    id: Optional[int] = Field(default=None, primary_key=True)
    character_id: int = Field(foreign_key=f"{DICTIONARY_SCHEMA}.characters.id")
    hanviet: str                                                    # comma-separated, e.g. "thượng" or "càn,kiền"
    pinyin: Optional[str] = Field(default=None, max_length=20)     # numeric tone, e.g. "shang4" (for disambiguation)
