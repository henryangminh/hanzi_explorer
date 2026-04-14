from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.schemas.search_history import BulkDeleteRequest, SearchHistoryListResponse
from app.services import search_history_service

router = APIRouter(prefix="/search-history", tags=["search-history"])


@router.get("", response_model=SearchHistoryListResponse)
def get_history(current_user: CurrentUser, session: DbSession):
    """Get current user's search history (newest first). Admin users have no history."""
    if current_user.is_admin:
        return SearchHistoryListResponse(items=[])
    items = search_history_service.get_user_history(session, current_user.id)
    return SearchHistoryListResponse(items=items)


@router.delete("")
def delete_all(current_user: CurrentUser, session: DbSession):
    """Delete all search history for current user."""
    if not current_user.is_admin:
        search_history_service.delete_all_history(session, current_user.id)
    return {"ok": True}


@router.delete("/bulk")
def delete_selected(body: BulkDeleteRequest, current_user: CurrentUser, session: DbSession):
    """Delete selected history entries by char."""
    if not current_user.is_admin:
        search_history_service.delete_selected_history(session, current_user.id, body.chars)
    return {"ok": True}
