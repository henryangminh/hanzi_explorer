from typing import Optional
from sqlmodel import Field, SQLModel


class SinoVn(SQLModel, table=True):
    """
    Sino-Vietnamese (Hán Việt) readings for Chinese characters.
    One row per (char, pinyin) pair. A character can have multiple rows
    if it has multiple pronunciations (e.g. 上: shang3 → thướng, shang4 → thượng).
    """
    __tablename__ = "sino_vn"

    id: Optional[int] = Field(default=None, primary_key=True)
    char: str = Field(index=True, max_length=4)
    pinyin: str = Field(max_length=20)   # numeric tone, e.g. "shang4"
    hanviet: str                          # comma-separated, e.g. "thượng" or "càn,kiền"
