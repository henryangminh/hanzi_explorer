from typing import Literal

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.api.v1.notebook_access import assert_can_edit, assert_can_view, get_notebook_or_404
from app.core.deps import CurrentUser, DbSession
from app.schemas.notebook import (
    AddEntriesRequest,
    AddEntriesResponse,
    AddEntryRequest,
    NotebookCreate,
    NotebookEntryResponse,
    NotebookResponse,
    NotebookUpdate,
)
from app.services import flashcard_service, notebook_service

router = APIRouter(prefix="/notebooks", tags=["notebooks"])

SortParam = Literal["updated_at_desc", "updated_at_asc", "created_at_desc", "created_at_asc", "name_asc", "name_desc"]


@router.get("", response_model=list[NotebookResponse])
def list_notebooks(
    session: DbSession,
    user: CurrentUser,
    sort: SortParam = "updated_at_desc",
):
    return notebook_service.list_notebooks(session, user.id, sort)


@router.post("", response_model=NotebookResponse, status_code=status.HTTP_201_CREATED)
def create_notebook(
    data: NotebookCreate,
    session: DbSession,
    user: CurrentUser,
):
    if data.type == "global" and not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có thể tạo sổ tay chung",
        )
    return notebook_service.create_notebook(session, user.id, data)


@router.get("/{notebook_id}/statuses")
def get_notebook_statuses(notebook_id: int, session: DbSession, user: CurrentUser):
    """The user's learned / not-learned status of every word in the notebook."""
    nb = get_notebook_or_404(session, notebook_id)
    assert_can_view(nb, user)
    return flashcard_service.get_notebook_statuses(session, user.id, notebook_id)


@router.get("/{notebook_id}/entries/preview")
def get_entries_preview(
    notebook_id: int,
    session: DbSession,
    user: CurrentUser,
    sort: SortParam = "updated_at_desc",
):
    """Stream notebook entries as NDJSON with brief CEDICT / CVDICT meanings for the grid view."""
    nb = get_notebook_or_404(session, notebook_id)
    assert_can_view(nb, user)

    def generate():
        for entry in notebook_service.stream_entries_preview(session, notebook_id, sort):
            yield entry.model_dump_json() + '\n'

    return StreamingResponse(generate(), media_type='application/x-ndjson')


@router.patch("/{notebook_id}", response_model=NotebookResponse)
def update_notebook(
    notebook_id: int,
    data: NotebookUpdate,
    session: DbSession,
    user: CurrentUser,
):
    nb = get_notebook_or_404(session, notebook_id)
    assert_can_edit(nb, user)
    return notebook_service.update_notebook(session, nb, data, user.id)


@router.delete("/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notebook(
    notebook_id: int,
    session: DbSession,
    user: CurrentUser,
):
    nb = get_notebook_or_404(session, notebook_id)
    assert_can_edit(nb, user)
    notebook_service.delete_notebook(session, nb)


@router.post("/{notebook_id}/entries", response_model=NotebookEntryResponse, status_code=status.HTTP_201_CREATED)
def add_entry(
    notebook_id: int,
    data: AddEntryRequest,
    session: DbSession,
    user: CurrentUser,
):
    nb = get_notebook_or_404(session, notebook_id)
    assert_can_edit(nb, user)
    try:
        return notebook_service.add_entry(session, nb, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/{notebook_id}/entries/bulk", response_model=AddEntriesResponse)
def add_entries(
    notebook_id: int,
    data: AddEntriesRequest,
    session: DbSession,
    user: CurrentUser,
):
    nb = get_notebook_or_404(session, notebook_id)
    assert_can_edit(nb, user)
    return notebook_service.add_entries(session, nb, data.chars)


@router.delete("/{notebook_id}/entries/{char}", status_code=status.HTTP_204_NO_CONTENT)
def remove_entry(
    notebook_id: int,
    char: str,
    session: DbSession,
    user: CurrentUser,
):
    nb = get_notebook_or_404(session, notebook_id)
    assert_can_edit(nb, user)
    removed = notebook_service.remove_entry(session, nb, char)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Từ không có trong sổ tay này")
