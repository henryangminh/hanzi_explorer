from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DefinitionSource(BaseModel):
    name: str
    version: Optional[str]
    entry_count: int
    imported_at: Optional[str]
    origin: Optional[str]


class Dataset(BaseModel):
    key: str              # translated by the client
    rows: int
    origin: str


class OnlineSource(BaseModel):
    source: str
    cached_words: int
    last_cached_at: Optional[str]


class CrawlStatus(BaseModel):
    chars_done: int
    chars_total: int
    words_done: int       # two-character words
    words_total: int
    requests_24h: int
    budget_24h: int
    denials_24h: int
    denials_7d: int
    last_request_at: Optional[datetime]
    eta_days: float


class DataSources(BaseModel):
    dictionary_built_at: datetime
    total_words: int
    definition_sources: list[DefinitionSource]
    datasets: list[Dataset]
    online_sources: list[OnlineSource]
    crawler: Optional[CrawlStatus]  # None when the crawl database is not on this machine
