from typing import List

from sqlmodel import Session, select

from app.models.character import Character
from app.models.radical import RadicalGroup
from app.schemas.radical import CharCard, RadicalCharsResponse, RadicalSummary
from app.services.dictionary_service import lookup_cedict
from app.services.hanzi_service import get_characters_with_component


def list_radicals(session: Session) -> List[RadicalSummary]:
    groups = session.exec(select(RadicalGroup).order_by(RadicalGroup.id)).all()
    return [
        RadicalSummary(
            id=g.id, radical=g.radical, pinyin=g.pinyin,
            meaning_en=g.meaning_en, meaning_vi=g.meaning_vi,
            stroke_count=g.stroke_count,
        )
        for g in groups
    ]


def _stroke_count(session: Session, char: str) -> int | None:
    row = session.exec(select(Character).where(Character.simplified == char)).first()
    return row.stroke_count if row else None


def _char_card(session: Session, char: str) -> CharCard:
    """A character with its first CC-CEDICT reading and meaning."""
    entries = lookup_cedict(session, char)
    first = entries[0] if entries else None
    return CharCard(
        char=char,
        pinyin=first.pinyin if first else '',
        meaning_en=first.meaning_en if first else '',
        stroke_count=_stroke_count(session, char),
    )


def get_radical_chars(session: Session, radical: str) -> RadicalCharsResponse | None:
    """All characters containing the radical. `radical` may list variant forms ('川,巛'); None if none match."""
    forms = [f.strip() for f in radical.split(',') if f.strip()]
    chars = dict.fromkeys(c for form in forms for c in get_characters_with_component(session, form))
    if not chars:
        return None
    return RadicalCharsResponse(radical=radical, chars=[_char_card(session, c) for c in chars])
