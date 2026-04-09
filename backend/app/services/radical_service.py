from typing import List

from sqlmodel import Session, select, func

from app.models.character import Character, PinyinReading, Definition, DictionarySource
from app.models.note import RadicalCompound, RadicalGroup
from app.schemas.radical import CompoundItem, RadicalDetail, RadicalSummary


def list_radicals(session: Session) -> List[RadicalSummary]:
    groups = session.exec(select(RadicalGroup)).all()
    result = []
    for g in groups:
        count = session.exec(
            select(func.count()).where(RadicalCompound.radical_id == g.id)
        ).one()
        result.append(RadicalSummary(
            id=g.id, radical=g.radical, pinyin=g.pinyin,
            meaning_en=g.meaning_en, meaning_vi=g.meaning_vi,
            stroke_count=g.stroke_count,
            compound_count=count,
        ))
    return result


def get_radical(session: Session, radical: str) -> RadicalDetail | None:
    group = session.exec(
        select(RadicalGroup).where(RadicalGroup.radical == radical)
    ).first()
    if not group:
        return None

    compounds_rows = session.exec(
        select(RadicalCompound).where(RadicalCompound.radical_id == group.id)
    ).all()

    # Get CEDICT source for English meaning lookup
    cedict_source = session.exec(
        select(DictionarySource).where(DictionarySource.name == 'CC-CEDICT')
    ).first()

    compounds: List[CompoundItem] = []
    for row in compounds_rows:
        char = session.exec(
            select(Character).where(Character.simplified == row.char_simplified)
        ).first()
        if char:
            first_pinyin = session.exec(
                select(PinyinReading)
                .where(PinyinReading.character_id == char.id)
                .order_by(PinyinReading.id)
            ).first()
            first_def = None
            if cedict_source:
                first_def = session.exec(
                    select(Definition)
                    .where(Definition.character_id == char.id)
                    .where(Definition.source_id == cedict_source.id)
                    .where(Definition.language == 'en')
                    .order_by(Definition.id)
                ).first()
            compounds.append(CompoundItem(
                char=char.simplified,
                pinyin=first_pinyin.pinyin if first_pinyin else '',
                meaning_en=first_def.meaning_text if first_def else '',
                note=row.note,
            ))
        else:
            compounds.append(CompoundItem(
                char=row.char_simplified, pinyin='', meaning_en=row.note or '', note=row.note,
            ))

    return RadicalDetail(
        id=group.id, radical=group.radical, pinyin=group.pinyin,
        meaning_en=group.meaning_en, meaning_vi=group.meaning_vi,
        stroke_count=group.stroke_count, compounds=compounds,
    )
