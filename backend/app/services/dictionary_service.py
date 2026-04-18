import json
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import quote

import httpx
from sqlmodel import Session, select

from app.core.pinyin import numeric_to_diacritic
from app.core.cedict_utils import clean_meaning
from app.models.character import Character, PinyinReading, Definition, DictionarySource, ExternalCache
from app.models.note import UserNote
from app.schemas.dictionary import (
    CedictEntry, CvdictEntry, DictLiteResponse, DictionaryResponse, ExternalSource,
    HanzipyData, NoteCreate, NoteUpdate, UserNoteResponse, XdhyEntry, XdhyDefItem,
)
from app.services.wiktionary_parser import parse_wiktionary, parse_vi_wikitext

CACHE_TTL_HOURS = 72
HEADERS = {'User-Agent': 'HanziExplorer/1.0 (personal study tool)'}


# ── Character lookup helpers ──────────────────────────────

def _get_character(session: Session, char: str) -> Optional[Character]:
    """Lookup a Character row by simplified, then traditional."""
    row = session.exec(
        select(Character).where(Character.simplified == char)
    ).first()
    if not row:
        row = session.exec(
            select(Character).where(Character.traditional == char)
        ).first()
    return row


def _get_source(session: Session, name: str) -> Optional[DictionarySource]:
    return session.exec(
        select(DictionarySource).where(DictionarySource.name == name)
    ).first()


def _get_pinyins(session: Session, character_id: int) -> list[PinyinReading]:
    return session.exec(
        select(PinyinReading)
        .where(PinyinReading.character_id == character_id)
        .order_by(PinyinReading.id)
    ).all()


def _get_definitions(session: Session, character_id: int, source_id: int, language: str) -> list[Definition]:
    return session.exec(
        select(Definition)
        .where(Definition.character_id == character_id)
        .where(Definition.source_id == source_id)
        .where(Definition.language == language)
        .order_by(Definition.id)
    ).all()


# ── CC-CEDICT ─────────────────────────────────────────────

def lookup_cedict(session: Session, char: str) -> list[CedictEntry]:
    char_row = _get_character(session, char)
    if not char_row:
        return []

    source = _get_source(session, 'CC-CEDICT')
    if not source:
        return []

    pinyins = _get_pinyins(session, char_row.id)
    defs = _get_definitions(session, char_row.id, source.id, 'en')

    results = []
    for i, defn in enumerate(defs):
        pinyin_row = pinyins[i] if i < len(pinyins) else (pinyins[0] if pinyins else None)
        pinyin_str = pinyin_row.pinyin if pinyin_row else ''
        results.append(CedictEntry(
            id=defn.id,
            simplified=char_row.simplified,
            traditional=char_row.traditional,
            pinyin=pinyin_str,
            meaning_en=clean_meaning(defn.meaning_text),
            radical=char_row.radical,
            stroke_count=char_row.stroke_count,
            hsk_level=None,
            source_name=source.name,
            is_separable=char_row.is_separable,
        ))
    return results


# ── CVDICT ────────────────────────────────────────────────

def lookup_cvdict(session: Session, char: str) -> list[CvdictEntry]:
    char_row = _get_character(session, char)
    if not char_row:
        return []

    source = _get_source(session, 'CVDICT')
    if not source:
        return []

    pinyins = _get_pinyins(session, char_row.id)
    defs = _get_definitions(session, char_row.id, source.id, 'vi')

    results = []
    for i, defn in enumerate(defs):
        pinyin_row = pinyins[i] if i < len(pinyins) else (pinyins[0] if pinyins else None)
        pinyin_str = pinyin_row.pinyin if pinyin_row else ''
        results.append(CvdictEntry(
            id=defn.id,
            simplified=char_row.simplified,
            traditional=char_row.traditional,
            pinyin=pinyin_str,
            meaning_vi=clean_meaning(defn.meaning_text),
            radical=char_row.radical,
            stroke_count=char_row.stroke_count,
            hsk_level=None,
            source_name=source.name,
            is_separable=char_row.is_separable,
        ))
    return results


# ── 现代汉语词典 (XDHY) ───────────────────────────────────

def lookup_xdhy(session: Session, char: str) -> list[XdhyEntry]:
    char_row = _get_character(session, char)
    if not char_row:
        return []

    source = _get_source(session, '现代汉语词典')
    if not source:
        return []

    defs = _get_definitions(session, char_row.id, source.id, 'zh')

    results = []
    for defn in defs:
        try:
            data = json.loads(defn.meaning_text)
        except (json.JSONDecodeError, TypeError):
            continue
        pinyin = data.get('pinyin', '')
        def_items = [
            XdhyDefItem(
                pos=d.get('pos'),
                definition=d.get('def', ''),
                examples=d.get('ex', []),
                is_sub=d.get('is_sub', False),
            )
            for d in data.get('defs', [])
        ]
        if not def_items:
            continue
        results.append(XdhyEntry(
            id=defn.id,
            simplified=char_row.simplified,
            traditional=char_row.traditional,
            pinyin=pinyin,
            defs=def_items,
            source_name=source.name,
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
    if 'error' in data and len(data) == 1:
        return
    if data.get('found') is False:
        return

    try:
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
    except Exception:
        session.rollback()


# ── Wiktionary EN ─────────────────────────────────────────

async def _fetch_en_single(char: str) -> dict:
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
    result = await _fetch_en_single(char)
    if 'error' in result and traditional and traditional != char:
        fallback = await _fetch_en_single(traditional)
        if 'error' not in fallback:
            return fallback
    return result


# ── Wiktionary VI ─────────────────────────────────────────

async def _fetch_wiktionary_vi(char: str) -> dict:
    url = 'https://vi.wiktionary.org/w/api.php'
    params = {
        'action': 'query', 'prop': 'revisions', 'rvprop': 'content',
        'titles': char, 'format': 'json', 'utf8': 1,
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

def _get_char_display_info(session: Session, char: str) -> tuple[str, list[str]]:
    """Return (first_pinyin_diacritic, sino_vn_list) for a char."""
    from app.services.sino_vn_service import _get_db_readings, _combine
    char_row = _get_character(session, char)
    if not char_row:
        return ('', [])
    pr = session.exec(
        select(PinyinReading)
        .where(PinyinReading.character_id == char_row.id)
        .order_by(PinyinReading.id)
    ).first()
    if not pr:
        return ('', [])
    pinyin_str = pr.pinyin or ''
    sino_vn: list[str] = []
    if pr.pinyin_numeric:
        chars_list = list(char)
        syllables = pr.pinyin_numeric.strip().split()
        if len(chars_list) == len(syllables):
            parts = [_get_db_readings(session, c, s) for c, s in zip(chars_list, syllables)]
            sino_vn = _combine(parts)
    return (pinyin_str, sino_vn)


def _note_to_response(note: UserNote, pinyin: str = '', sino_vn: list[str] | None = None) -> UserNoteResponse:
    return UserNoteResponse(
        id=note.id,
        char=note.char,
        title=note.title,
        detail=note.detail,
        updated_at=note.updated_at.isoformat() if note.updated_at else None,
        pinyin=pinyin,
        sino_vn=sino_vn or [],
    )


def get_all_user_notes(session: Session, user_id: int) -> list[UserNoteResponse]:
    notes = session.exec(
        select(UserNote)
        .where(UserNote.user_id == user_id)
        .where(UserNote.title != '')
        .order_by(UserNote.updated_at.desc())
    ).all()
    # Batch-cache display info per unique char to avoid redundant lookups
    char_info: dict[str, tuple[str, list[str]]] = {}
    for note in notes:
        if note.char not in char_info:
            char_info[note.char] = _get_char_display_info(session, note.char)
    return [_note_to_response(n, pinyin=char_info[n.char][0], sino_vn=char_info[n.char][1]) for n in notes]


def get_user_notes(session: Session, user_id: int, char: str) -> list[UserNoteResponse]:
    notes = session.exec(
        select(UserNote)
        .where(UserNote.user_id == user_id)
        .where(UserNote.char == char)
        .order_by(UserNote.created_at)
    ).all()
    if not notes:
        return []
    pinyin, sino_vn = _get_char_display_info(session, char)
    return [_note_to_response(n, pinyin=pinyin, sino_vn=sino_vn) for n in notes]


def create_user_note(session: Session, user_id: int, char: str, data: NoteCreate) -> UserNoteResponse:
    note = UserNote(user_id=user_id, char=char, title=data.title, detail=data.detail)
    session.add(note)
    session.commit()
    session.refresh(note)
    pinyin, sino_vn = _get_char_display_info(session, char)
    return _note_to_response(note, pinyin=pinyin, sino_vn=sino_vn)


def update_user_note(session: Session, user_id: int, note_id: int, data: NoteUpdate) -> UserNoteResponse:
    from fastapi import HTTPException
    note = session.get(UserNote, note_id)
    if not note or note.user_id != user_id:
        raise HTTPException(status_code=404, detail="Note not found")
    note.title = data.title
    note.detail = data.detail
    note.updated_at = datetime.now(timezone.utc)
    session.add(note)
    session.commit()
    session.refresh(note)
    pinyin, sino_vn = _get_char_display_info(session, note.char)
    return _note_to_response(note, pinyin=pinyin, sino_vn=sino_vn)


def delete_user_note(session: Session, user_id: int, note_id: int) -> None:
    from fastapi import HTTPException
    note = session.get(UserNote, note_id)
    if not note or note.user_id != user_id:
        raise HTTPException(status_code=404, detail="Note not found")
    session.delete(note)
    session.commit()


# ── HSK tags (from drkameleon notebook data) ─────────────

def lookup_hsk_tags(session: Session, char: str) -> list[str]:
    from sqlalchemy import text
    rows = session.execute(
        text("""
            SELECT DISTINCT n.name
            FROM notebooks n
            JOIN notebook_entries ne ON n.id = ne.notebook_id
            JOIN characters c ON c.id = ne.char_id
            WHERE (c.simplified = :char OR c.traditional = :char) AND n.type = 'global'
            ORDER BY n.name
        """),
        {"char": char},
    ).fetchall()
    return [row[0] for row in rows]


# ── Main ──────────────────────────────────────────────────

def get_lite_entry(session: Session, char: str) -> DictLiteResponse:
    """Fast lookup — CEDICT + CVDICT only, no external API calls."""
    cedict_entries = lookup_cedict(session, char)

    from app.services.sino_vn_service import _get_db_readings, _combine
    from app.services.synonym_antonym_service import lookup_synonyms, lookup_antonyms
    sino_vn: list[str] = []
    if cedict_entries:
        char_row = _get_character(session, char)
        if char_row:
            first_pinyin = session.exec(
                select(PinyinReading)
                .where(PinyinReading.character_id == char_row.id)
                .order_by(PinyinReading.id)
            ).first()
            if first_pinyin and first_pinyin.pinyin_numeric:
                chars_list = list(char)
                syllables = first_pinyin.pinyin_numeric.strip().split()
                if len(chars_list) == len(syllables):
                    parts = [_get_db_readings(session, c, s) for c, s in zip(chars_list, syllables)]
                    sino_vn = _combine(parts)

    return DictLiteResponse(
        char=char,
        cedict=cedict_entries,
        cvdict=lookup_cvdict(session, char),
        xdhy=lookup_xdhy(session, char),
        sino_vn=sino_vn,
        hsk_tags=lookup_hsk_tags(session, char),
        synonyms=lookup_synonyms(session, char),
        antonyms=lookup_antonyms(session, char),
    )


async def get_dictionary_entry(session: Session, char: str, user_id: int) -> DictionaryResponse:
    from app.services.sino_vn_service import compute_sino_vn
    from app.services.hanzi_service import get_hanzipy_components

    cedict_entries = lookup_cedict(session, char)

    traditional = next(
        (e.traditional for e in cedict_entries if e.traditional),
        None
    )

    sino_vn: list[str] = []
    if cedict_entries:
        lookup_char = cedict_entries[0].simplified if cedict_entries[0].simplified else char
        char_row = _get_character(session, lookup_char)
        if char_row:
            first_pinyin = session.exec(
                select(PinyinReading)
                .where(PinyinReading.character_id == char_row.id)
                .order_by(PinyinReading.id)
            ).first()
            if first_pinyin and first_pinyin.pinyin_numeric:
                sino_vn = await compute_sino_vn(session, lookup_char, first_pinyin.pinyin_numeric)

    hanzipy_components = get_hanzipy_components(char)

    from app.services.synonym_antonym_service import lookup_synonyms, lookup_antonyms

    return DictionaryResponse(
        char=char,
        cedict=cedict_entries,
        cvdict=lookup_cvdict(session, char),
        xdhy=lookup_xdhy(session, char),
        external=await fetch_external_sources(session, char, traditional=traditional),
        user_notes=get_user_notes(session, user_id, char),
        hsk_tags=lookup_hsk_tags(session, char),
        sino_vn=sino_vn,
        hanzipy=HanzipyData(components=hanzipy_components) if hanzipy_components else None,
        synonyms=lookup_synonyms(session, char),
        antonyms=lookup_antonyms(session, char),
    )
