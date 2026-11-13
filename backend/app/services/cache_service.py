"""Time-limited cache of external responses (Wiktionary, hvdic), stored in app.db."""
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlmodel import Session, select

from app.models.cache import ExternalCache

# Dictionary pages rarely change, so external responses are kept for a long time.
EXTERNAL_CACHE_TTL_HOURS = 90 * 24


def _find(session: Session, char: str, source: str) -> Optional[ExternalCache]:
    return session.exec(
        select(ExternalCache)
        .where(ExternalCache.char == char)
        .where(ExternalCache.source == source)
    ).first()


def get_cached(session: Session, char: str, source: str, ttl_hours: int = EXTERNAL_CACHE_TTL_HOURS) -> Optional[Any]:
    """The cached payload, or None when missing or older than `ttl_hours` (expired rows are deleted)."""
    entry = _find(session, char, source)
    if not entry:
        return None
    if datetime.now(timezone.utc) - datetime.fromisoformat(entry.cached_at) > timedelta(hours=ttl_hours):
        session.delete(entry)
        session.commit()
        return None
    return json.loads(entry.payload_json)


def set_cached(session: Session, char: str, source: str, payload: Any) -> None:
    """Insert or replace a cache entry. A failed cache write never fails the request."""
    try:
        entry = _find(session, char, source) or ExternalCache(char=char, source=source, payload_json="", cached_at="")
        entry.payload_json = json.dumps(payload, ensure_ascii=False)
        entry.cached_at = datetime.now(timezone.utc).isoformat()
        session.add(entry)
        session.commit()
    except Exception:
        session.rollback()
