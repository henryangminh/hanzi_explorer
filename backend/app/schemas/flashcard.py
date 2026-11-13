from typing import Literal, Optional
from pydantic import BaseModel


class FlashcardReading(BaseModel):
    pinyin: str                    # with tone marks, e.g. "shàng"
    sino_vn: Optional[str] = None  # Hán Việt of this reading, e.g. "thượng"


class FlashcardCardResponse(BaseModel):
    char: str
    readings: list[FlashcardReading] = []  # every reading of the word, primary first
    cedict_brief: Optional[str] = None
    cvdict_brief: Optional[str] = None
    status: Optional[str] = None


class FlashcardStatusUpdate(BaseModel):
    char: str
    status: Optional[Literal['learned', 'not_learned']] = None
