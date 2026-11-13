"""Fetch Wiktionary (EN REST API, VI wikitext), with caching of successful responses."""
from urllib.parse import quote

import httpx
from sqlmodel import Session

from app.core.http import HTTP_HEADERS
from app.schemas.dictionary import ExternalSource
from app.services.cache_service import get_cached, set_cached
from app.services.wiktionary_parser import parse_vi_wikitext, parse_wiktionary


async def _fetch_en_single(char: str) -> dict:
    url = f'https://en.wiktionary.org/api/rest_v1/page/definition/{quote(char, safe="")}'
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(url, headers=HTTP_HEADERS)
            if resp.status_code == 200:
                return resp.json()
            return {'error': f'HTTP {resp.status_code}'}
    except Exception as exc:
        return {'error': str(exc)}


async def _fetch_en(char: str, traditional: str | None = None) -> dict:
    """Simplified form first; fall back to the traditional form when the page is missing."""
    result = await _fetch_en_single(char)
    if 'error' in result and traditional and traditional != char:
        fallback = await _fetch_en_single(traditional)
        if 'error' not in fallback:
            return fallback
    return result


async def _fetch_vi(char: str) -> dict:
    """{'wikitext': ...} or {'error': ...}"""
    params = {
        'action': 'query', 'prop': 'revisions', 'rvprop': 'content',
        'titles': char, 'format': 'json', 'utf8': 1,
    }
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get('https://vi.wiktionary.org/w/api.php', params=params, headers=HTTP_HEADERS)
            if resp.status_code != 200:
                return {'error': f'HTTP {resp.status_code}'}
            pages = resp.json().get('query', {}).get('pages', {})
            for page_id, page in pages.items():
                if page_id == '-1':
                    return {'error': 'Page not found'}
                revisions = page.get('revisions', [])
                if not revisions:
                    return {'error': 'No revisions'}
                wikitext = revisions[0].get('*', '').strip()
                if not wikitext:
                    return {'error': 'Empty content'}
                return {'wikitext': wikitext}
            return {'error': 'No pages returned'}
    except Exception as exc:
        return {'error': str(exc)}


def _parse_vi(data: dict) -> dict:
    if 'error' in data:
        return {'found': False, 'error': data['error']}
    wikitext = data.get('wikitext', '')
    if not wikitext:
        return {'found': False, 'error': 'Empty content'}
    return parse_vi_wikitext(wikitext)


def _is_cacheable(data: dict) -> bool:
    """Only successful responses are cached, so failures are retried next time."""
    return not ('error' in data and len(data) == 1) and data.get('found') is not False


async def _get_raw(session: Session, char: str, source: str, fetch) -> tuple[dict, bool]:
    """(raw response, came from cache)"""
    cached = get_cached(session, char, source)
    if cached:
        return cached, True
    raw = await fetch()
    if _is_cacheable(raw):
        set_cached(session, char, source, raw)
    return raw, False


async def fetch_external_sources(session: Session, char: str, traditional: str | None = None) -> list[ExternalSource]:
    raw_en, en_cached = await _get_raw(session, char, 'wiktionary_en', lambda: _fetch_en(char, traditional))
    raw_vi, vi_cached = await _get_raw(session, char, 'wiktionary_vi', lambda: _fetch_vi(char))
    return [
        ExternalSource(source='wiktionary_en', label='Wiktionary (EN)',
                       data=parse_wiktionary(raw_en, 'en'), from_cache=en_cached),
        ExternalSource(source='wiktionary_vi', label='Wiktionary (VI)',
                       data=_parse_vi(raw_vi), from_cache=vi_cached),
    ]
