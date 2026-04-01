import json
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import quote

import httpx
from sqlmodel import Session, select

from app.core.pinyin import numeric_to_diacritic
from app.core.cedict_utils import clean_meaning
from app.models.character import CcCedictCharacter, DictionarySource, ExternalCache
from app.models.cvdict_character import CvdictCharacter
from app.models.note import UserNote
from app.schemas.dictionary import (
    CedictEntry, CvdictEntry, DictLiteResponse, DictionaryResponse, ExternalSource,
    NoteUpsert, UserNoteResponse,
)
from app.services.wiktionary_parser import parse_wiktionary, parse_vi_wikitext

CACHE_TTL_HOURS = 72
HEADERS = {'User-Agent': 'HanziExplorer/1.0 (personal study tool)'}


# ── CC-CEDICT ─────────────────────────────────────────────

def lookup_cvdict(session: Session, char: str) -> list[CvdictEntry]:
    rows = session.exec(
        select(CvdictCharacter)
        .where(CvdictCharacter.simplified == char)
        .order_by(CvdictCharacter.id)
    ).all()

    results = []
    for row in rows:
        source = session.get(DictionarySource, row.source_id)
        results.append(CvdictEntry(
            id=row.id,
            simplified=row.simplified,
            traditional=row.traditional,
            pinyin=numeric_to_diacritic(row.pinyin),
            meaning_vi=row.meaning_vi,
            radical=row.radical,
            stroke_count=row.stroke_count,
            hsk_level=row.hsk_level,
            source_name=source.name if source else 'CVDICT',
        ))
    return results


def lookup_cedict(session: Session, char: str) -> list[CedictEntry]:
    rows = session.exec(
        select(CcCedictCharacter)
        .where(CcCedictCharacter.simplified == char)
        .order_by(CcCedictCharacter.id)
    ).all()

    results = []
    for row in rows:
        source = session.get(DictionarySource, row.source_id)
        results.append(CedictEntry(
            id=row.id,
            simplified=row.simplified,
            traditional=row.traditional,
            pinyin=numeric_to_diacritic(row.pinyin),
            meaning_en=clean_meaning(row.meaning_en),
            radical=row.radical,
            stroke_count=row.stroke_count,
            hsk_level=row.hsk_level,
            source_name=source.name if source else 'Unknown',
        ))
    return results


# ── Cache — only store successful responses ───────────────

def _get_cache(session: Session, char: str, source: str) -> Optional[dict]:
    entry = session.exec(
        select(ExternalCache)
        .where(ExternalCache.char == char)
        .where(ExternalCache.source == source)
    ).first()
    if not entry:
        return None
    cached_at = datetime.fromisoformat(entry.cached_at)
    if datetime.now(timezone.utc) - cached_at > timedelta(hours=CACHE_TTL_HOURS):
        session.delete(entry)
        session.commit()
        return None
    return json.loads(entry.payload_json)


def _set_cache(session: Session, char: str, source: str, data: dict) -> None:
    """Only cache successful responses (found=True or has Chinese keys)."""
    # Don't cache error responses
    if 'error' in data and len(data) == 1:
        return
    # Don't cache parsed "not found" results
    if data.get('found') is False:
        return

    existing = session.exec(
        select(ExternalCache)
        .where(ExternalCache.char == char)
        .where(ExternalCache.source == source)
    ).first()
    payload = json.dumps(data, ensure_ascii=False)
    if existing:
        existing.payload_json = payload
        existing.cached_at = datetime.now(timezone.utc).isoformat()
        session.add(existing)
    else:
        session.add(ExternalCache(
            char=char, source=source, payload_json=payload,
            cached_at=datetime.now(timezone.utc).isoformat(),
        ))
    session.commit()


# ── Wiktionary EN ─────────────────────────────────────────

async def _fetch_en_single(char: str) -> dict:
    """Fetch one character/word from EN Wiktionary REST API."""
    encoded = quote(char, safe='')
    url = f'https://en.wiktionary.org/api/rest_v1/page/definition/{encoded}'
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(url, headers=HEADERS)
            if resp.status_code == 200:
                return resp.json()
            return {'error': f'HTTP {resp.status_code}'}
    except Exception as exc:
        return {'error': str(exc)}


async def _fetch_wiktionary_en(char: str, traditional: str | None = None) -> dict:
    """
    Fetch from EN Wiktionary. If simplified form returns 404,
    fall back to traditional form (e.g. 睡觉 → 睡覺).
    """
    result = await _fetch_en_single(char)

    # Fallback to traditional if simplified not found
    if 'error' in result and traditional and traditional != char:
        fallback = await _fetch_en_single(traditional)
        if 'error' not in fallback:
            return fallback

    return result


# ── Wiktionary VI (MediaWiki Action API) ──────────────────

async def _fetch_wiktionary_vi(char: str) -> dict:
    """
    Fetch raw wikitext from Vietnamese Wiktionary via revisions API.
    Returns the raw wikitext string or an error dict.
    """
    url = 'https://vi.wiktionary.org/w/api.php'
    params = {
        'action': 'query',
        'prop': 'revisions',
        'rvprop': 'content',
        'titles': char,
        'format': 'json',
        'utf8': 1,
    }
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(url, params=params, headers=HEADERS)
            if resp.status_code != 200:
                return {'error': f'HTTP {resp.status_code}'}
            data = resp.json()
            pages = data.get('query', {}).get('pages', {})
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


def _parse_vi_response(data: dict) -> dict:
    if 'error' in data:
        return {'found': False, 'error': data['error']}
    wikitext = data.get('wikitext', '')
    if not wikitext:
        return {'found': False, 'error': 'Empty content'}
    return parse_vi_wikitext(wikitext)


# ── Aggregate external sources ────────────────────────────

async def fetch_external_sources(session: Session, char: str, traditional: str | None = None) -> list[ExternalSource]:
    sources: list[ExternalSource] = []

    # Wiktionary EN — fallback to traditional if simplified not found
    cached_raw = _get_cache(session, char, 'wiktionary_en')
    from_cache = cached_raw is not None
    if not cached_raw:
        cached_raw = await _fetch_wiktionary_en(char, traditional=traditional)
        parsed_en = parse_wiktionary(cached_raw, 'en')
        _set_cache(session, char, 'wiktionary_en', cached_raw)
    else:
        parsed_en = parse_wiktionary(cached_raw, 'en')

    sources.append(ExternalSource(
        source='wiktionary_en', label='Wiktionary (EN)',
        data=parsed_en, from_cache=from_cache,
    ))

    # Wiktionary VI
    cached_vi = _get_cache(session, char, 'wiktionary_vi')
    from_cache_vi = cached_vi is not None
    if not cached_vi:
        cached_vi = await _fetch_wiktionary_vi(char)
        parsed_vi = _parse_vi_response(cached_vi)
        _set_cache(session, char, 'wiktionary_vi', cached_vi)
    else:
        parsed_vi = _parse_vi_response(cached_vi)

    sources.append(ExternalSource(
        source='wiktionary_vi', label='Wiktionary (VI)',
        data=parsed_vi, from_cache=from_cache_vi,
    ))

    return sources


# ── User notes ────────────────────────────────────────────

def get_user_note(session: Session, user_id: int, char: str) -> Optional[UserNoteResponse]:
    note = session.exec(
        select(UserNote)
        .where(UserNote.user_id == user_id)
        .where(UserNote.char == char)
    ).first()
    return _note_to_response(note) if note else None


def upsert_user_note(session: Session, user_id: int, char: str, data: NoteUpsert) -> UserNoteResponse:
    note = session.exec(
        select(UserNote)
        .where(UserNote.user_id == user_id)
        .where(UserNote.char == char)
    ).first()
    tags_str = ','.join(data.tags) if data.tags else None
    if note:
        if data.meaning_vi is not None: note.meaning_vi = data.meaning_vi
        if data.note is not None: note.note = data.note
        if data.tags is not None: note.tags = tags_str
        note.updated_at = datetime.now(timezone.utc)
    else:
        note = UserNote(
            user_id=user_id, char=char,
            meaning_vi=data.meaning_vi, note=data.note, tags=tags_str,
        )
    session.add(note)
    session.commit()
    session.refresh(note)
    return _note_to_response(note)


def _note_to_response(note: UserNote) -> UserNoteResponse:
    return UserNoteResponse(
        id=note.id, char=note.char, meaning_vi=note.meaning_vi,
        note=note.note, tags=note.tags.split(',') if note.tags else [],
    )


# ── HSK tags (from drkameleon notebook data) ─────────────

def lookup_hsk_tags(session: Session, char: str) -> list[str]:
    """Return names of global HSK notebooks that contain this character/word."""
    from sqlalchemy import text
    rows = session.execute(
        text("""
            SELECT DISTINCT n.name
            FROM notebooks n
            JOIN notebook_entries ne ON n.id = ne.notebook_id
            WHERE ne.char = :char AND n.type = 'global'
            ORDER BY n.name
        """),
        {"char": char},
    ).fetchall()
    return [row[0] for row in rows]


# ── Main ──────────────────────────────────────────────────

def get_lite_entry(session: Session, char: str) -> DictLiteResponse:
    """Fast lookup — CEDICT + CVDICT only, no external API calls."""
    return DictLiteResponse(
        char=char,
        cedict=lookup_cedict(session, char),
        cvdict=lookup_cvdict(session, char),
    )


async def get_dictionary_entry(session: Session, char: str, user_id: int) -> DictionaryResponse:
    cedict_entries = lookup_cedict(session, char)

    # Get traditional form from first CEDICT entry for EN Wiktionary fallback
    traditional = next(
        (e.traditional for e in cedict_entries if e.traditional),
        None
    )

    return DictionaryResponse(
        char=char,
        cedict=cedict_entries,
        cvdict=lookup_cvdict(session, char),
        external=await fetch_external_sources(session, char, traditional=traditional),
        user_note=get_user_note(session, user_id, char),
        hsk_tags=lookup_hsk_tags(session, char),
    )
