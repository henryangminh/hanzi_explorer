from typing import List
from fastapi import APIRouter, HTTPException, status
from app.core.deps import CurrentUser, DbSession
from app.schemas.dictionary import DictionaryResponse, NoteUpsert, UserNoteResponse
from app.services import dictionary_service

router = APIRouter(prefix="/dictionary", tags=["dictionary"])

@router.put("/{char}/note", response_model=UserNoteResponse)
def upsert_note(char: str, body: NoteUpsert, current_user: CurrentUser, session: DbSession):
    return dictionary_service.upsert_user_note(session, current_user.id, char, body)


@router.get("/search", response_model=List[DictionaryResponse])
async def search_phrase(q: str, current_user: CurrentUser, session: DbSession):
    """
    Segment a Chinese phrase and return dictionary entries.
    Multi-char words appear first, then individual chars — all deduped.
    Example: 我可以游泳 → [可以, 游泳, 我, 可, 以, 游, 泳]
    """
    from app.services.segmentation import segment
    from typing import List as _List

    q = q.strip()
    if not q:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Query is empty")
    if len(q) > 20:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Query too long (max 20 chars)")

    tokens = segment(session, q)

    results: _List[DictionaryResponse] = []
    for token in tokens:
        entry = await dictionary_service.get_dictionary_entry(session, token, current_user.id)
        results.append(entry)

    return results

@router.get("/{char}", response_model=DictionaryResponse)
async def get_char(char: str, current_user: CurrentUser, session: DbSession):
    if len(char) != 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only single characters are supported",
        )
    return await dictionary_service.get_dictionary_entry(session, char, current_user.id)