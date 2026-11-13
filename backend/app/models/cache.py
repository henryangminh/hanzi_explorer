from typing import Optional
from sqlmodel import Field, SQLModel


class ExternalCache(SQLModel, table=True):
    """Cached responses from external sources (Wiktionary, hvdic). Lives in app.db."""
    __tablename__ = "external_cache"

    id: Optional[int] = Field(default=None, primary_key=True)
    char: str = Field(index=True, max_length=10)
    source: str = Field(max_length=50)
    payload_json: str
    cached_at: str
