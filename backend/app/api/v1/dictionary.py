from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.deps import CurrentUser, DbSession
from app.schemas.dictionary import DictLiteResponse, DictionaryResponse
from app.services import dictionary_service, search_history_service, search_service

router = APIRouter(prefix="/dictionary", tags=["dictionary"])

MAX_QUERY_LENGTH = 50


def _require_query(q: str) -> str:
    q = q.strip()
    if not q:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Query is empty")
    if len(q) > MAX_QUERY_LENGTH:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Query too long (max {MAX_QUERY_LENGTH} chars)")
    return q


@router.get("/lookup", response_model=DictLiteResponse)
def lookup_lite(q: str, current_user: CurrentUser, session: DbSession):
    """Fast local-DB lookup without external API calls. Used by notebook detail view."""
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

    Streams LITE results (local DB only, no Wiktionary) as NDJSON so the client can render each
    entry immediately. Use GET /full/{char} to fetch the full entry when the user expands a card.
    """
    q = search_service.traditional_to_simplified(session, _require_query(q))
    tokens = search_service.find_words(session, q)

    # Admins have no search history
    if not current_user.is_admin:
        search_history_service.record_search(session, current_user.id, q)

    async def generate():
        for token in tokens:
            yield dictionary_service.get_lite_entry(session, token).model_dump_json() + '\n'

    return StreamingResponse(generate(), media_type='application/x-ndjson')


@router.get("/full/{char}", response_model=DictionaryResponse)
async def get_char_full(char: str, current_user: CurrentUser, session: DbSession):
    """Full dictionary entry with Wiktionary data (uses cache). Called lazily when user expands a card."""
    return await dictionary_service.get_dictionary_entry(session, char, current_user.id)


@router.get("/{char}", response_model=DictionaryResponse)
async def get_char(char: str, current_user: CurrentUser, session: DbSession):
    return await dictionary_service.get_dictionary_entry(session, char, current_user.id)
