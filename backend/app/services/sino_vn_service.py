"""
Sino-Vietnamese (Hán Việt) reading computation.

Strategy for single chars:
  - Look up sino_vietnamese table by character_id + pinyin — exact match first, then any pinyin.

Strategy for 2-char words:
  1. Try crawling hvdic.thivien.net (cached in external_cache with source='hvdic').
  2. If not found, compose from individual chars: all combinations of readings.

Strategy for 3+ char words:
  1. Try crawling hvdic first.
  2. If not found, greedily split from left into 2-char chunks using cached hvdic data.
     Any uncached/unknown chunk falls back to single-char compose.
  3. Create all combinations of the parts.
"""
import json
from datetime import datetime, timezone, timedelta
from urllib.parse import quote

import httpx
from sqlmodel import Session, select

from app.models.character import Character, ExternalCache
from app.models.sino_vn import SinoVietnamese

HVDIC_CACHE_TTL_HOURS = 168  # 1 week
HEADERS = {'User-Agent': 'HanziExplorer/1.0 (personal study tool)'}


# ── DB lookup ─────────────────────────────────────────────

def _get_character_id(session: Session, char: str) -> int | None:
    """Get character_id for a char — try simplified first, then traditional."""
    row = session.exec(
        select(Character.id).where(Character.simplified == char)
    ).first()
    if row:
        return row

    # Fallback: char is a traditional form — find the simplified row
    row = session.exec(
        select(Character.id).where(Character.traditional == char)
    ).first()
    return row if row else None


def _get_db_readings(session: Session, char: str, pinyin_num: str) -> list[str]:
    """Get Hán Việt readings for a single char from sino_vietnamese table.

    Tries exact (character_id, pinyin) match first; falls back to any pinyin for the char;
    then tries the traditional form if simplified isn't in sino_vietnamese.
    """
    char_id = _get_character_id(session, char)
    if not char_id:
        return []

    # Exact match by pinyin
    rows = session.exec(
        select(SinoVietnamese)
        .where(SinoVietnamese.character_id == char_id)
        .where(SinoVietnamese.pinyin == pinyin_num)
    ).all()
    if rows:
        return _extract_readings(rows)

    # Any pinyin for this char
    rows = session.exec(
        select(SinoVietnamese).where(SinoVietnamese.character_id == char_id)
    ).all()
    if rows:
        return _extract_readings(rows)

    return []


def _extract_readings(rows) -> list[str]:
    result: list[str] = []
    for row in rows:
        for r in row.hanviet.split(','):
            r = r.strip()
            if r and r not in result:
                result.append(r)
    return result


# ── Combination helper ────────────────────────────────────

def _combine(parts: list[list[str]]) -> list[str]:
    """Create all combinations of reading-lists, joined by space."""
    result: list[str] = ['']
    for readings in parts:
        if not readings:
            continue
        new_result: list[str] = []
        for existing in result:
            for r in readings:
                combined = (existing + ' ' + r).strip()
                if combined not in new_result:
                    new_result.append(combined)
        result = new_result
    return [r for r in result if r]


# ── hvdic cache ───────────────────────────────────────────

def _get_hvdic_cache(session: Session, char: str) -> list[str] | None:
    """Return cached hvdic result, or None if not cached / expired."""
    entry = session.exec(
        select(ExternalCache)
        .where(ExternalCache.char == char)
        .where(ExternalCache.source == 'hvdic')
    ).first()
    if not entry:
        return None
    cached_at = datetime.fromisoformat(entry.cached_at)
    if datetime.now(timezone.utc) - cached_at > timedelta(hours=HVDIC_CACHE_TTL_HOURS):
        session.delete(entry)
        session.commit()
        return None
    return json.loads(entry.payload_json)


def _set_hvdic_cache(session: Session, char: str, readings: list[str]) -> None:
    existing = session.exec(
        select(ExternalCache)
        .where(ExternalCache.char == char)
        .where(ExternalCache.source == 'hvdic')
    ).first()
    payload = json.dumps(readings, ensure_ascii=False)
    now = datetime.now(timezone.utc).isoformat()
    if existing:
        existing.payload_json = payload
        existing.cached_at = now
        session.add(existing)
    else:
        session.add(ExternalCache(char=char, source='hvdic', payload_json=payload, cached_at=now))
    session.commit()


# ── hvdic crawl ───────────────────────────────────────────

async def _crawl_hvdic(session: Session, char: str) -> list[str] | None:
    """Crawl hvdic.thivien.net for Hán Việt readings of a multi-char word."""
    cached = _get_hvdic_cache(session, char)
    if cached is not None:
        return cached if cached else None

    url = f'https://hvdic.thivien.net/whv/{quote(char, safe="")}'
    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
            resp = await client.get(url, headers=HEADERS)
            if resp.status_code != 200:
                _set_hvdic_cache(session, char, [])
                return None

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(resp.text, 'html.parser')
        readings: list[str] = []
        for p in soup.find_all('p', class_='hvres-spell'):
            for a in p.find_all('a'):
                text = a.get_text().strip()
                if text and text not in readings:
                    readings.append(text)

        _set_hvdic_cache(session, char, readings)
        return readings if readings else None
    except Exception:
        return None


# ── Main entry point ──────────────────────────────────────

async def compute_sino_vn(session: Session, char: str, pinyin_numeric: str) -> list[str]:
    """Compute Hán Việt readings for a character/word.

    Args:
        char: The Chinese character(s), e.g. "判断" or "人"
        pinyin_numeric: Space-separated numeric-tone pinyin from CEDICT,
                        e.g. "pan4 duan4" or "ren2"

    Returns:
        List of Hán Việt readings, e.g. ["phán đoán", "phán đoạn"]
    """
    chars = list(char)
    syllables = pinyin_numeric.strip().split()

    if not chars or len(chars) != len(syllables):
        return []

    # ── Single char ──────────────────────────────────────
    if len(chars) == 1:
        return _get_db_readings(session, char, syllables[0])

    # ── 2-char word ──────────────────────────────────────
    if len(chars) == 2:
        crawled = await _crawl_hvdic(session, char)
        if crawled:
            return crawled
        a = _get_db_readings(session, chars[0], syllables[0])
        b = _get_db_readings(session, chars[1], syllables[1])
        return _combine([a, b])

    # ── 3+ chars ─────────────────────────────────────────
    crawled = await _crawl_hvdic(session, char)
    if crawled:
        return crawled

    # Greedy left-to-right 2-char splitting using cached hvdic data
    parts: list[list[str]] = []
    i = 0
    while i < len(chars):
        if i + 1 < len(chars):
            two_char = chars[i] + chars[i + 1]
            cached_two = _get_hvdic_cache(session, two_char)
            if cached_two:
                parts.append(cached_two)
                i += 2
                continue
        parts.append(_get_db_readings(session, chars[i], syllables[i]))
        i += 1

    return _combine(parts)
