from typing import Optional
from sqlmodel import Field, SQLModel


class SinoVietnamese(SQLModel, table=True):
    """
    Sino-Vietnamese (Hán Việt) readings for Chinese characters.
    One row per (character, pinyin) pair — a character can have multiple rows
    if it has multiple pronunciations (e.g. 上: shang3 → thướng, shang4 → thượng).
    """
    __tablename__ = "sino_vietnamese"

    id: Optional[int] = Field(default=None, primary_key=True)
    character_id: int = Field(foreign_key="characters.id", index=True)
    hanviet: str                                                    # comma-separated, e.g. "thượng" or "càn,kiền"
    pinyin: Optional[str] = Field(default=None, max_length=20)     # numeric tone, e.g. "shang4" (for disambiguation)
