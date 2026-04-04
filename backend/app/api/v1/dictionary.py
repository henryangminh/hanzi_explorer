from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from app.core.deps import CurrentUser, DbSession
from app.schemas.dictionary import DictLiteResponse, DictionaryResponse, NoteUpsert, UserNoteResponse
from app.services import dictionary_service

router = APIRouter(prefix="/dictionary", tags=["dictionary"])

@router.put("/{char}/note", response_model=UserNoteResponse)
def upsert_note(char: str, body: NoteUpsert, current_user: CurrentUser, session: DbSession):
    return dictionary_service.upsert_user_note(session, current_user.id, char, body)


@router.get("/lookup", response_model=DictLiteResponse)
def lookup_lite(q: str, current_user: CurrentUser, session: DbSession):
    """Fast CEDICT + CVDICT lookup without external API calls. Used by notebook detail view."""
    q = q.strip()
    if not q:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Query is empty")
    return dictionary_service.get_lite_entry(session, q)


@router.get("/search")
async def search_phrase(q: str, current_user: CurrentUser, session: DbSession):
    """
    Three search modes:
    - sentence (4+ Chinese chars): extract all sub-words, sorted by length then position
    - short (1-3 Chinese chars): prefix search with match score
    - pinyin (no Chinese chars): search by pinyin, supports tone numbers (ming2tian1) or no-tone (bukeqi)

    Streams results as NDJSON (one JSON object per line) so the client can render
    each entry as soon as it arrives rather than waiting for the full response.
    """
    from app.services.search_service import detect_search_mode, extract_all_words, short_search, pinyin_search, traditional_to_simplified

    q = q.strip()
    if not q:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Query is empty")
    if len(q) > 50:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Query too long (max 50 chars)")

    q = traditional_to_simplified(session, q)
    mode = detect_search_mode(q)

    if mode == 'sentence':
        tokens = extract_all_words(session, q)
    elif mode == 'short':
        tokens = short_search(session, q)
    else:  # pinyin
        tokens = pinyin_search(session, q)[:30]

    async def generate():
        for token in tokens:
            entry = await dictionary_service.get_dictionary_entry(session, token, current_user.id)
            yield entry.model_dump_json() + '\n'

    return StreamingResponse(generate(), media_type='application/x-ndjson')

@router.get("/{char}", response_model=DictionaryResponse)
async def get_char(char: str, current_user: CurrentUser, session: DbSession):
    return await dictionary_service.get_dictionary_entry(session, char, current_user.id)