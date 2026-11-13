"""Dictionary entries: per-source lookups (CC-CEDICT, CVDICT, 现代汉语词典) and the assembled
lite / full responses."""
import json
from typing import Callable, TypeVar

from sqlmodel import Session

from app.core.cedict_utils import clean_meaning
from app.models.character import Character, Definition, DictionarySource
from app.schemas.dictionary import (
    CedictEntry, CvdictEntry, DictLiteResponse, DictionaryResponse, HanzipyData, XdhyDefItem, XdhyEntry,
)
from app.services.character_lookup import (
    get_character, get_definitions, get_primary_reading, get_readings, get_source,
)
from app.services.hanzi_service import get_hanzipy_components
from app.services.note_service import get_user_notes
from app.services.notebook_service import global_notebook_names_containing
from app.services.sino_vn_service import compose_from_db, compute_sino_vn
from app.services.synonym_antonym_service import lookup_antonyms, lookup_synonyms
from app.services.wiktionary_service import fetch_external_sources

Entry = TypeVar('Entry')


# ── Per-source lookups ────────────────────────────────────

def _lookup_bilingual(
    session: Session, char: str, source_name: str, language: str,
    build: Callable[[Character, DictionarySource, Definition, str], Entry],
) -> list[Entry]:
    """CC-CEDICT / CVDICT: one entry per definition, paired with the reading at the same position."""
    char_row = get_character(session, char)
    source = get_source(session, source_name) if char_row else None
    if not source:
        return []
    readings = get_readings(session, char_row.id)
    entries = []
    for i, defn in enumerate(get_definitions(session, char_row.id, source.id, language)):
        reading = readings[i] if i < len(readings) else (readings[0] if readings else None)
        entries.append(build(char_row, source, defn, reading.pinyin if reading else ''))
    return entries


def lookup_cedict(session: Session, char: str) -> list[CedictEntry]:
    return _lookup_bilingual(session, char, 'CC-CEDICT', 'en', lambda c, src, d, pinyin: CedictEntry(
        id=d.id, simplified=c.simplified, traditional=c.traditional, pinyin=pinyin,
        meaning_en=clean_meaning(d.meaning_text), radical=c.radical, stroke_count=c.stroke_count,
        hsk_level=None, source_name=src.name, is_separable=c.is_separable,
    ))


def lookup_cvdict(session: Session, char: str) -> list[CvdictEntry]:
    return _lookup_bilingual(session, char, 'CVDICT', 'vi', lambda c, src, d, pinyin: CvdictEntry(
        id=d.id, simplified=c.simplified, traditional=c.traditional, pinyin=pinyin,
        meaning_vi=clean_meaning(d.meaning_text), radical=c.radical, stroke_count=c.stroke_count,
        hsk_level=None, source_name=src.name, is_separable=c.is_separable,
    ))


def _parse_xdhy(char_row: Character, source: DictionarySource, defn: Definition) -> XdhyEntry | None:
    """XDHY definitions are JSON: {"pinyin": "hǎo", "defs": [{"pos", "def", "ex", "is_sub"}, ...]}."""
    try:
        data = json.loads(defn.meaning_text)
    except (json.JSONDecodeError, TypeError):
        return None
    def_items = [
        XdhyDefItem(pos=d.get('pos'), definition=d.get('def', ''), examples=d.get('ex', []), is_sub=d.get('is_sub', False))
        for d in data.get('defs', [])
    ]
    if not def_items:
        return None
    return XdhyEntry(
        id=defn.id, simplified=char_row.simplified, traditional=char_row.traditional,
        pinyin=data.get('pinyin', ''), defs=def_items, source_name=source.name,
    )


def lookup_xdhy(session: Session, char: str) -> list[XdhyEntry]:
    char_row = get_character(session, char)
    source = get_source(session, '现代汉语词典') if char_row else None
    if not source:
        return []
    entries = (_parse_xdhy(char_row, source, d) for d in get_definitions(session, char_row.id, source.id, 'zh'))
    return [e for e in entries if e]


def _sino_vn_by_reading(session: Session, word: str) -> dict[str, list[str]]:
    """Hán Việt of each reading of the word, keyed by its diacritic pinyin (上: shǎng → thướng, shàng → thượng)."""
    char_row = get_character(session, word)
    if not char_row:
        return {}
    result: dict[str, list[str]] = {}
    for reading in get_readings(session, char_row.id):
        if reading.pinyin_numeric and reading.pinyin not in result:
            readings = compose_from_db(session, word, reading.pinyin_numeric)
            if readings:
                result[reading.pinyin] = readings
    return result


def _primary_pinyin_numeric(session: Session, word: str) -> str | None:
    char_row = get_character(session, word)
    reading = get_primary_reading(session, char_row.id) if char_row else None
    return reading.pinyin_numeric if reading else None


# ── Assembled responses ───────────────────────────────────

def get_lite_entry(session: Session, char: str) -> DictLiteResponse:
    """Fast lookup — local DB only, no external API calls."""
    cedict_entries = lookup_cedict(session, char)
    pinyin_numeric = _primary_pinyin_numeric(session, char) if cedict_entries else None

    return DictLiteResponse(
        char=char,
        cedict=cedict_entries,
        cvdict=lookup_cvdict(session, char),
        xdhy=lookup_xdhy(session, char),
        sino_vn=compose_from_db(session, char, pinyin_numeric) if pinyin_numeric else [],
        sino_vn_by_reading=_sino_vn_by_reading(session, char),
        hsk_tags=global_notebook_names_containing(session, char),
        synonyms=lookup_synonyms(session, char),
        antonyms=lookup_antonyms(session, char),
    )


async def get_dictionary_entry(session: Session, char: str, user_id: int) -> DictionaryResponse:
    """Full entry: local DB + Wiktionary + hvdic Hán Việt + the user's notes."""
    cedict_entries = lookup_cedict(session, char)
    traditional = next((e.traditional for e in cedict_entries if e.traditional), None)

    sino_vn: list[str] = []
    if cedict_entries:
        headword = cedict_entries[0].simplified or char
        pinyin_numeric = _primary_pinyin_numeric(session, headword)
        if pinyin_numeric:
            sino_vn = await compute_sino_vn(session, headword, pinyin_numeric)

    hanzipy_components = get_hanzipy_components(char)

    return DictionaryResponse(
        char=char,
        cedict=cedict_entries,
        cvdict=lookup_cvdict(session, char),
        xdhy=lookup_xdhy(session, char),
        external=await fetch_external_sources(session, char, traditional=traditional),
        user_notes=get_user_notes(session, user_id, char),
        hsk_tags=global_notebook_names_containing(session, char),
        sino_vn=sino_vn,
        sino_vn_by_reading=_sino_vn_by_reading(session, char),
        hanzipy=HanzipyData(components=hanzipy_components) if hanzipy_components else None,
        synonyms=lookup_synonyms(session, char),
        antonyms=lookup_antonyms(session, char),
    )
