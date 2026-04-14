from datetime import datetime
from typing import List

from pydantic import BaseModel


class SearchHistoryItem(BaseModel):
    id: int
    char: str
    searched_at: datetime


class SearchHistoryListResponse(BaseModel):
    items: List[SearchHistoryItem]


class BulkDeleteRequest(BaseModel):
    chars: List[str]
