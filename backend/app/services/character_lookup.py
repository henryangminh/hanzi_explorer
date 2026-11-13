"""Read helpers for dictionary rows (characters, readings, definitions, sources)."""
from typing import Optional

from sqlmodel import Session, select

from app.models.character import Character, Definition, DictionarySource, PinyinReading


def get_character(session: Session, char: str) -> Optional[Character]:
    """The Character row for `char`, looked up by simplified form, then traditional."""
    row = session.exec(select(Character).where(Character.simplified == char)).first()
    if not row:
        row = session.exec(select(Character).where(Character.traditional == char)).first()
    return row


def resolve_simplified(session: Session, char: str) -> str:
    """The simplified headword for `char` (which may be a traditional form), or `char` itself."""
    row = get_character(session, char)
    return row.simplified if row else char


def get_source(session: Session, name: str) -> Optional[DictionarySource]:
    return session.exec(select(DictionarySource).where(DictionarySource.name == name)).first()


def get_brief_source_ids(session: Session) -> tuple[int, int]:
    """(CC-CEDICT id, CVDICT id); -1 when a source is not imported."""
    sources = session.exec(
        select(DictionarySource).where(DictionarySource.name.in_(["CC-CEDICT", "CVDICT"]))
    ).all()
    src_by_name = {s.name: s.id for s in sources}
    return src_by_name.get("CC-CEDICT", -1), src_by_name.get("CVDICT", -1)


def get_readings(session: Session, character_id: int) -> list[PinyinReading]:
    """All readings of a character; the first one is the primary reading."""
    return session.exec(
        select(PinyinReading)
        .where(PinyinReading.character_id == character_id)
        .order_by(PinyinReading.id)
    ).all()


def get_primary_reading(session: Session, character_id: int) -> Optional[PinyinReading]:
    return session.exec(
        select(PinyinReading)
        .where(PinyinReading.character_id == character_id)
        .order_by(PinyinReading.id)
    ).first()


def get_definitions(session: Session, character_id: int, source_id: int, language: str) -> list[Definition]:
    return session.exec(
        select(Definition)
        .where(Definition.character_id == character_id)
        .where(Definition.source_id == source_id)
        .where(Definition.language == language)
        .order_by(Definition.id)
    ).all()


def batch_brief_lookup(
    session: Session, char_ids: list[int]
) -> tuple[dict[int, list[str]], dict[int, str], dict[int, str]]:
    """Batch-fetch, per character id: numeric pinyins (deduped, primary first),
    the first CC-CEDICT meaning and the first CVDICT meaning."""
    cedict_id, cvdict_id = get_brief_source_ids(session)

    pinyins_by_char: dict[int, list[str]] = {}
    for pr in session.exec(
        select(PinyinReading)
        .where(PinyinReading.character_id.in_(char_ids))
        .order_by(PinyinReading.character_id, PinyinReading.id)
    ).all():
        seen = pinyins_by_char.setdefault(pr.character_id, [])
        if pr.pinyin_numeric and pr.pinyin_numeric not in seen:
            seen.append(pr.pinyin_numeric)

    return (
        pinyins_by_char,
        _first_definitions(session, char_ids, cedict_id, "en"),
        _first_definitions(session, char_ids, cvdict_id, "vi"),
    )


def _first_definitions(session: Session, char_ids: list[int], source_id: int, language: str) -> dict[int, str]:
    result: dict[int, str] = {}
    for d in session.exec(
        select(Definition)
        .where(
            Definition.character_id.in_(char_ids),
            Definition.source_id == source_id,
            Definition.language == language,
        )
        .order_by(Definition.character_id, Definition.id)
    ).all():
        result.setdefault(d.character_id, d.meaning_text)
    return result
