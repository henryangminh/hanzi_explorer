from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DbSession
from app.models.notebook import Notebook
from app.schemas.notebook import (
    AddEntryRequest,
    NotebookCreate,
    NotebookDetail,
    NotebookEntryPreview,
    NotebookEntryResponse,
    NotebookResponse,
    NotebookUpdate,
)
from app.services import notebook_service

router = APIRouter(prefix="/notebooks", tags=["notebooks"])

SortParam = Literal["updated_at_desc", "updated_at_asc", "created_at_desc", "created_at_asc", "name_asc", "name_desc"]


def _get_notebook_or_404(session, notebook_id: int) -> Notebook:
    nb = session.get(Notebook, notebook_id)
    if nb is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found")
    return nb


def _assert_can_edit(nb: Notebook, user) -> None:
    """Raise 403 if user cannot edit this notebook."""
    if nb.type == "global" and not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ admin mới có thể chỉnh sửa sổ tay chung")
    if nb.type == "private" and nb.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền chỉnh sửa sổ tay này")


def _assert_can_view(nb: Notebook, user) -> None:
    """Raise 403 if user cannot view this notebook."""
    if nb.type == "private" and nb.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xem sổ tay này")


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


@router.get("/{notebook_id}/entries/preview", response_model=list[NotebookEntryPreview])
def get_entries_preview(
    notebook_id: int,
    session: DbSession,
    user: CurrentUser,
    sort: SortParam = "updated_at_desc",
):
    """Return notebook entries with brief CEDICT / CVDICT meanings for the grid view."""
    from sqlalchemy import text
    from app.core.cedict_utils import clean_meaning

    nb = _get_notebook_or_404(session, notebook_id)
    _assert_can_view(nb, user)

    from app.core.pinyin import numeric_to_diacritic

    rows = session.execute(
        text("""
            SELECT
                ne.id, ne.char, ne.added_at,
                (SELECT meaning_en FROM cc_cedict_characters
                 WHERE simplified = ne.char ORDER BY id LIMIT 1) AS cedict_raw,
                (SELECT meaning_vi FROM cvdict_characters
                 WHERE simplified = ne.char ORDER BY id LIMIT 1) AS cvdict_raw,
                (SELECT GROUP_CONCAT(pinyin, '|||') FROM (
                    SELECT DISTINCT pinyin FROM cc_cedict_characters
                    WHERE simplified = ne.char ORDER BY id
                )) AS pinyins_raw
            FROM notebook_entries ne
            WHERE ne.notebook_id = :nb_id
        """),
        {"nb_id": notebook_id},
    ).fetchall()

    def _cedict_brief(raw: str | None) -> str | None:
        if not raw:
            return None
        return clean_meaning(raw).split(";")[0].strip()

    def _cvdict_brief(raw: str | None) -> str | None:
        if not raw:
            return None
        return raw.split("/")[0].strip()

    def _pinyins(raw: str | None) -> list[str]:
        if not raw:
            return []
        return [numeric_to_diacritic(p.strip()) for p in raw.split("|||") if p.strip()]

    from app.services.sino_vn_service import _get_db_readings, _combine

    def _sino_vn(char: str, pinyins_raw: str | None) -> list[str]:
        if not pinyins_raw:
            return []
        # Use the first (most common) pinyin entry for sino_vn lookup
        first_pinyin = pinyins_raw.split("|||")[0].strip()
        chars = list(char)
        syllables = first_pinyin.split()
        if len(chars) != len(syllables):
            return []
        parts = [_get_db_readings(session, c, s) for c, s in zip(chars, syllables)]
        return _combine(parts)

    entries = [
        NotebookEntryPreview(
            id=row[0],
            char=row[1],
            added_at=str(row[2]),
            cedict_brief=_cedict_brief(row[3]),
            cvdict_brief=_cvdict_brief(row[4]),
            pinyins=_pinyins(row[5]),
            sino_vn=_sino_vn(row[1], row[5]),
        )
        for row in rows
    ]

    if sort == "name_asc":
        entries.sort(key=lambda e: e.char)
    elif sort == "name_desc":
        entries.sort(key=lambda e: e.char, reverse=True)
    elif sort in ("created_at_asc", "updated_at_asc"):
        entries.sort(key=lambda e: e.added_at)
    else:
        entries.sort(key=lambda e: e.added_at, reverse=True)

    return entries


@router.get("/{notebook_id}", response_model=NotebookDetail)
def get_notebook(
    notebook_id: int,
    session: DbSession,
    user: CurrentUser,
    sort: SortParam = "updated_at_desc",
):
    nb = _get_notebook_or_404(session, notebook_id)
    _assert_can_view(nb, user)
    detail = notebook_service.get_notebook(session, notebook_id, user.id)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found")
    # re-sort entries based on param
    if sort == "name_asc":
        detail.entries.sort(key=lambda e: e.char)
    elif sort == "name_desc":
        detail.entries.sort(key=lambda e: e.char, reverse=True)
    elif sort == "created_at_asc" or sort == "updated_at_asc":
        detail.entries.sort(key=lambda e: e.added_at)
    else:
        detail.entries.sort(key=lambda e: e.added_at, reverse=True)
    return detail


@router.patch("/{notebook_id}", response_model=NotebookResponse)
def update_notebook(
    notebook_id: int,
    data: NotebookUpdate,
    session: DbSession,
    user: CurrentUser,
):
    nb = _get_notebook_or_404(session, notebook_id)
    _assert_can_edit(nb, user)
    return notebook_service.update_notebook(session, nb, data)


@router.delete("/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notebook(
    notebook_id: int,
    session: DbSession,
    user: CurrentUser,
):
    nb = _get_notebook_or_404(session, notebook_id)
    _assert_can_edit(nb, user)
    notebook_service.delete_notebook(session, nb)


@router.post("/{notebook_id}/entries", response_model=NotebookEntryResponse, status_code=status.HTTP_201_CREATED)
def add_entry(
    notebook_id: int,
    data: AddEntryRequest,
    session: DbSession,
    user: CurrentUser,
):
    nb = _get_notebook_or_404(session, notebook_id)
    _assert_can_edit(nb, user)
    try:
        return notebook_service.add_entry(session, nb, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.delete("/{notebook_id}/entries/{char}", status_code=status.HTTP_204_NO_CONTENT)
def remove_entry(
    notebook_id: int,
    char: str,
    session: DbSession,
    user: CurrentUser,
):
    nb = _get_notebook_or_404(session, notebook_id)
    _assert_can_edit(nb, user)
    removed = notebook_service.remove_entry(session, nb, char)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Từ không có trong sổ tay này")
