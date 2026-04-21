from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DbSession
from app.models.notebook import Notebook
from app.schemas.notebook import FlashcardCardResponse, FlashcardStatusUpdate
from app.services import flashcard_service

router = APIRouter(prefix="/notebooks/flashcards", tags=["flashcards"])


def _get_notebook_or_404(session, notebook_id: int) -> Notebook:
    nb = session.get(Notebook, notebook_id)
    if nb is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found")
    return nb


def _assert_can_view(nb: Notebook, user) -> None:
    if nb.type == "private" and nb.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xem sổ tay này")


@router.get("", response_model=list[FlashcardCardResponse])
def get_flashcards(
    notebook_ids: str,
    session: DbSession,
    user: CurrentUser,
    count: int = 10,
):
    ids: list[int] = [int(p.strip()) for p in notebook_ids.split(",") if p.strip().isdigit()]
    if not ids:
        return []
    for nb_id in ids:
        nb = _get_notebook_or_404(session, nb_id)
        _assert_can_view(nb, user)
    count = max(1, min(count, 100))
    return flashcard_service.get_flashcards(session, ids, user.id, count)


@router.get("/statuses")
def get_flashcard_statuses(chars: str, session: DbSession, user: CurrentUser):
    char_list = [c.strip() for c in chars.split(",") if c.strip()][:500]
    return flashcard_service.get_flashcard_statuses(session, user.id, char_list)


@router.get("/marked", response_model=list[FlashcardCardResponse])
def get_marked_flashcards(session: DbSession, user: CurrentUser):
    return flashcard_service.get_marked_flashcards(session, user.id)


@router.put("/status", status_code=status.HTTP_204_NO_CONTENT)
def update_flashcard_status(
    data: FlashcardStatusUpdate,
    session: DbSession,
    user: CurrentUser,
):
    flashcard_service.update_flashcard_status(session, user.id, data)
