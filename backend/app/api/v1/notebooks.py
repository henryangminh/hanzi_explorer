from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

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


@router.get("/{notebook_id}/entries/preview")
def get_entries_preview(
    notebook_id: int,
    session: DbSession,
    user: CurrentUser,
    sort: SortParam = "updated_at_desc",
):
    """Stream notebook entries as NDJSON with brief CEDICT / CVDICT meanings for the grid view."""
    from sqlalchemy import text
    from app.core.cedict_utils import clean_meaning
    from app.core.pinyin import numeric_to_diacritic

    nb = _get_notebook_or_404(session, notebook_id)
    _assert_can_view(nb, user)

    order_clause = {
        "name_asc":       "nc.simplified ASC",
        "name_desc":      "nc.simplified DESC",
        "created_at_asc": "nc.added_at ASC",
        "updated_at_asc": "nc.added_at ASC",
        "created_at_desc":"nc.added_at DESC",
    }.get(sort, "nc.added_at DESC")

    # Pre-fetch source IDs once to avoid subqueries inside the CTE
    src_row = session.execute(text(
        "SELECT name, id FROM dictionary_sources WHERE name IN ('CC-CEDICT', 'CVDICT')"
    )).fetchall()
    src_ids = {row[0]: row[1] for row in src_row}
    cedict_id = src_ids.get("CC-CEDICT", -1)
    cvdict_id  = src_ids.get("CVDICT", -1)

    # CTE-based query: all lookups are set-based (no correlated subqueries),
    # each auxiliary table is scanned once filtered to only notebook chars.
    result = session.execute(
        text(f"""
            WITH nb_chars AS (
                SELECT ne.id AS entry_id, c.id AS char_id, c.simplified, c.traditional, ne.added_at
                FROM notebook_entries ne
                JOIN characters c ON c.id = ne.char_id
                WHERE ne.notebook_id = :nb_id
            ),
            en_min AS (
                SELECT character_id, MIN(id) AS min_id
                FROM definitions
                WHERE source_id = :cedict_id AND language = 'en'
                  AND character_id IN (SELECT char_id FROM nb_chars)
                GROUP BY character_id
            ),
            vi_min AS (
                SELECT character_id, MIN(id) AS min_id
                FROM definitions
                WHERE source_id = :cvdict_id AND language = 'vi'
                  AND character_id IN (SELECT char_id FROM nb_chars)
                GROUP BY character_id
            ),
            py AS (
                SELECT character_id,
                       GROUP_CONCAT(pinyin_numeric, '|||') AS pinyins_raw
                FROM (
                    SELECT character_id, pinyin_numeric
                    FROM pinyin_readings
                    WHERE character_id IN (SELECT char_id FROM nb_chars)
                    GROUP BY character_id, pinyin_numeric
                    ORDER BY character_id, MIN(id)
                )
                GROUP BY character_id
            ),
            first_py AS (
                SELECT pr.character_id, pr.pinyin_numeric
                FROM pinyin_readings pr
                JOIN (
                    SELECT character_id, MIN(id) AS min_id
                    FROM pinyin_readings
                    WHERE character_id IN (SELECT char_id FROM nb_chars)
                    GROUP BY character_id
                ) m ON m.character_id = pr.character_id AND m.min_id = pr.id
            ),
            sn AS (
                SELECT sv.character_id,
                       GROUP_CONCAT(sv.hanviet, '/') AS sino_vn_raw
                FROM sino_vietnamese sv
                JOIN first_py fp ON fp.character_id = sv.character_id
                                 AND sv.pinyin = fp.pinyin_numeric
                GROUP BY sv.character_id
            )
            SELECT nc.entry_id, nc.simplified, nc.added_at,
                   nc.traditional,
                   en_d.meaning_text AS cedict_raw,
                   vi_d.meaning_text AS cvdict_raw,
                   py.pinyins_raw,
                   sn.sino_vn_raw
            FROM nb_chars nc
            LEFT JOIN en_min   ON en_min.character_id  = nc.char_id
            LEFT JOIN definitions en_d ON en_d.id      = en_min.min_id
            LEFT JOIN vi_min   ON vi_min.character_id  = nc.char_id
            LEFT JOIN definitions vi_d ON vi_d.id      = vi_min.min_id
            LEFT JOIN py       ON py.character_id       = nc.char_id
            LEFT JOIN sn       ON sn.character_id       = nc.char_id
            ORDER BY {order_clause}
        """),
        {"nb_id": notebook_id, "cedict_id": cedict_id, "cvdict_id": cvdict_id},
    )

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

    def _sino_vn(raw: str | None) -> list[str]:
        if not raw:
            return []
        return [r.strip() for r in raw.split("/") if r.strip()]

    def generate():
        for row in result:
            entry = NotebookEntryPreview(
                id=row[0],
                char=row[1],
                added_at=str(row[2]),
                traditional=row[3] if row[3] and row[3] != row[1] else None,
                cedict_brief=_cedict_brief(row[4]),
                cvdict_brief=_cvdict_brief(row[5]),
                pinyins=_pinyins(row[6]),
                sino_vn=_sino_vn(row[7]),
            )
            yield entry.model_dump_json() + '\n'

    return StreamingResponse(generate(), media_type='application/x-ndjson')


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
