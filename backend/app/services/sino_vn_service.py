"""
Sino-Vietnamese (Hán Việt) reading computation.

Strategy for single chars:
  - Look up sino_vietnamese table by character_id + pinyin — exact match first, then any pinyin.

Strategy for 2-char words:
  1. Try crawling hvdic.thivien.net (cached in external_cache with source='hvdic', 90 days).
  2. If not found, compose from individual chars: all combinations of readings.

Strategy for 3+ char words:
  1. Try crawling hvdic first.
  2. If not found, greedily split from left into 2-char chunks using cached hvdic data.
     Any uncached/unknown chunk falls back to single-char compose.
  3. Create all combinations of the parts.
"""
from urllib.parse import quote

import httpx
from bs4 import BeautifulSoup
from sqlmodel import Session, select

from app.core.http import HTTP_HEADERS
from app.models.sino_vn import SinoVietnamese
from app.services.cache_service import get_cached, set_cached
from app.services.character_lookup import get_character

HVDIC_SOURCE = 'hvdic'


# ── DB lookup ─────────────────────────────────────────────

def get_db_readings(session: Session, char: str, pinyin_num: str) -> list[str]:
    """Hán Việt readings of a single char: exact (character, pinyin) match first, else any pinyin."""
    char_row = get_character(session, char)
    if not char_row:
        return []

    rows = session.exec(
        select(SinoVietnamese)
        .where(SinoVietnamese.character_id == char_row.id)
        .where(SinoVietnamese.pinyin == pinyin_num)
    ).all()
    if not rows:
        rows = session.exec(
            select(SinoVietnamese).where(SinoVietnamese.character_id == char_row.id)
        ).all()
    return _extract_readings(rows)


def _extract_readings(rows) -> list[str]:
    result: list[str] = []
    for row in rows:
        for r in row.hanviet.split(','):
            r = r.strip()
            if r and r not in result:
                result.append(r)
    return result


def combine(parts: list[list[str]]) -> list[str]:
    """All combinations of reading-lists, joined by space."""
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


def compose_from_db(session: Session, word: str, pinyin_numeric: str) -> list[str]:
    """Hán Việt of a word composed char by char from the DB (no network).
    `pinyin_numeric` must have one syllable per char, e.g. ('判断', 'pan4 duan4')."""
    chars, syllables = list(word), pinyin_numeric.strip().split()
    if not chars or len(chars) != len(syllables):
        return []
    return combine([get_db_readings(session, c, s) for c, s in zip(chars, syllables)])


# ── hvdic crawl ───────────────────────────────────────────

def _parse_hvdic_page(html: str) -> list[str]:
    readings: list[str] = []
    for p in BeautifulSoup(html, 'html.parser').find_all('p', class_='hvres-spell'):
        for a in p.find_all('a'):
            text = a.get_text().strip()
            if text and text not in readings:
                readings.append(text)
    return readings


async def _crawl_hvdic(session: Session, word: str) -> list[str] | None:
    """Readings from hvdic.thivien.net (cached, including "not found" as an empty list)."""
    cached = get_cached(session, word, HVDIC_SOURCE)
    if cached is not None:
        return cached or None

    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
            resp = await client.get(f'https://hvdic.thivien.net/whv/{quote(word, safe="")}', headers=HTTP_HEADERS)
        readings = _parse_hvdic_page(resp.text) if resp.status_code == 200 else []
    except Exception:
        return None
    set_cached(session, word, HVDIC_SOURCE, readings)
    return readings or None


def _compose_with_cached_pairs(session: Session, chars: list[str], syllables: list[str]) -> list[str]:
    """Greedy left-to-right: use cached hvdic readings of 2-char chunks, else single chars."""
    parts: list[list[str]] = []
    i = 0
    while i < len(chars):
        if i + 1 < len(chars):
            cached_pair = get_cached(session, chars[i] + chars[i + 1], HVDIC_SOURCE)
            if cached_pair:
                parts.append(cached_pair)
                i += 2
                continue
        parts.append(get_db_readings(session, chars[i], syllables[i]))
        i += 1
    return combine(parts)


# ── Main entry point ──────────────────────────────────────

async def compute_sino_vn(session: Session, word: str, pinyin_numeric: str) -> list[str]:
    """Hán Việt readings of a character/word, e.g. ('判断', 'pan4 duan4') → ['phán đoán', 'phán đoạn']."""
    chars, syllables = list(word), pinyin_numeric.strip().split()
    if not chars or len(chars) != len(syllables):
        return []
    if len(chars) == 1:
        return get_db_readings(session, word, syllables[0])

    crawled = await _crawl_hvdic(session, word)
    if crawled:
        return crawled
    if len(chars) == 2:
        return compose_from_db(session, word, pinyin_numeric)
    return _compose_with_cached_pairs(session, chars, syllables)
