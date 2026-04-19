from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.deps import CurrentUser, DbSession
from app.schemas.radical import RadicalDetail, RadicalSummary
from app.services import radical_service
from app.services.dictionary_service import lookup_cedict
from app.services.hanzi_service import get_characters_with_component

router = APIRouter(prefix="/radicals", tags=["radicals"])


class CharCard(BaseModel):
    char: str
    pinyin: str
    meaning_en: str
    stroke_count: Optional[int] = None


class RadicalCharsResponse(BaseModel):
    radical: str
    chars: List[CharCard]


@router.get("", response_model=List[RadicalSummary])
def list_radicals(current_user: CurrentUser, session: DbSession):
    return radical_service.list_radicals(session)


@router.get("/{radical}/chars", response_model=RadicalCharsResponse)
def get_radical_chars(radical: str, current_user: CurrentUser, session: DbSession):
    """
    Return all characters that share the given radical,
    enriched with pinyin from CC-CEDICT.
    Radical may be comma-separated (e.g. '川,巛') — all forms are looked up.
    """
    forms = [f.strip() for f in radical.split(',') if f.strip()]
    chars: list[str] = []
    for form in forms:
        result = get_characters_with_component(session, form)
        if result:
            chars.extend(result)
    if not chars:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"No data for radical '{radical}'")

    result: list[CharCard] = []
    seen: set[str] = set()
    for char in chars:
        if char in seen:
            continue
        seen.add(char)
        stroke = radical_service.get_character_stroke_count(session, char)
        entries = lookup_cedict(session, char)
        if entries:
            first = entries[0]
            result.append(CharCard(
                char=char,
                pinyin=first.pinyin,
                meaning_en=first.meaning_en,
                stroke_count=stroke,
            ))
        else:
            result.append(CharCard(char=char, pinyin='', meaning_en='', stroke_count=stroke))

    return RadicalCharsResponse(radical=radical, chars=result)


@router.get("/{radical}", response_model=RadicalDetail)
def get_radical(radical: str, current_user: CurrentUser, session: DbSession):
    result = radical_service.get_radical(session, radical)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Radical '{radical}' not found")
    return result
