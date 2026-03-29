from typing import List

from sqlmodel import Session, select, func

from app.models.character import CcCedictCharacter
from app.models.note import RadicalCompound, RadicalGroup
from app.schemas.radical import CompoundItem, RadicalDetail, RadicalSummary
from app.core.pinyin import numeric_to_diacritic


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

    compounds: List[CompoundItem] = []
    for row in compounds_rows:
        # Get first CEDICT entry for this char
        char = session.exec(
            select(CcCedictCharacter)
            .where(CcCedictCharacter.simplified == row.char_simplified)
        ).first()
        if char:
            compounds.append(CompoundItem(
                char=char.simplified,
                pinyin=numeric_to_diacritic(char.pinyin),
                meaning_en=char.meaning_en,
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
