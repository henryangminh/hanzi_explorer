from typing import Optional

from pydantic import BaseModel, Field

MAX_READER_TEXT = 5000


class SegmentRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_READER_TEXT)


class ReaderToken(BaseModel):
    text: str                      # as written in the input (traditional stays traditional)
    word: Optional[str] = None     # simplified dictionary word; None for punctuation, Latin text, unknown chars
    pinyin: Optional[str] = None   # reading in context, e.g. "yín háng"
    status: Optional[str] = None   # the user's "learned" / "not_learned"
    hsk: dict[str, int] = {}       # HSK level per standard ("old", "new", "newest"); 7 stands for 7-9
