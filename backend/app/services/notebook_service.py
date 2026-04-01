from datetime import datetime, timezone
from typing import Literal, Optional

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select, func

from app.models.notebook import Notebook, NotebookEntry
from app.schemas.notebook import (
    AddEntryRequest,
    NotebookCreate,
    NotebookDetail,
    NotebookEntryResponse,
    NotebookResponse,
    NotebookUpdate,
)

SortOrder = Literal["updated_at_desc", "updated_at_asc", "created_at_desc", "created_at_asc", "name_asc", "name_desc"]


def _sort_notebooks(query, sort: SortOrder):
    if sort == "name_asc":
        return query.order_by(Notebook.name.asc())
    if sort == "name_desc":
        return query.order_by(Notebook.name.desc())
    if sort == "created_at_asc":
        return query.order_by(Notebook.created_at.asc())
    if sort == "created_at_desc":
        return query.order_by(Notebook.created_at.desc())
    if sort == "updated_at_asc":
        return query.order_by(Notebook.updated_at.asc())
    # default: updated_at_desc
    return query.order_by(Notebook.updated_at.desc())


def _to_response(session: Session, nb: Notebook) -> NotebookResponse:
    count = session.exec(
        select(func.count(NotebookEntry.id)).where(NotebookEntry.notebook_id == nb.id)
    ).one()
    return NotebookResponse(
        id=nb.id,
        name=nb.name,
        description=nb.description,
        type=nb.type,
        owner_id=nb.owner_id,
        entry_count=count,
        created_at=nb.created_at,
        updated_at=nb.updated_at,
    )


def list_notebooks(
    session: Session,
    user_id: int,
    sort: SortOrder = "updated_at_desc",
) -> list[NotebookResponse]:
    stmt = select(Notebook).where(
        (Notebook.type == "global") | (Notebook.owner_id == user_id)
    )
    stmt = _sort_notebooks(stmt, sort)
    notebooks = session.exec(stmt).all()
    return [_to_response(session, nb) for nb in notebooks]


def get_notebook(session: Session, notebook_id: int, user_id: int) -> Optional[NotebookDetail]:
    nb = session.get(Notebook, notebook_id)
    if nb is None:
        return None
    if nb.type == "private" and nb.owner_id != user_id:
        return None
    entries = session.exec(
        select(NotebookEntry)
        .where(NotebookEntry.notebook_id == notebook_id)
        .order_by(NotebookEntry.added_at.desc())
    ).all()
    entry_responses = [
        NotebookEntryResponse(
            id=e.id,
            notebook_id=e.notebook_id,
            char=e.char,
            added_at=e.added_at,
        )
        for e in entries
    ]
    return NotebookDetail(
        id=nb.id,
        name=nb.name,
        description=nb.description,
        type=nb.type,
        owner_id=nb.owner_id,
        entry_count=len(entries),
        created_at=nb.created_at,
        updated_at=nb.updated_at,
        entries=entry_responses,
    )


def create_notebook(
    session: Session,
    user_id: int,
    data: NotebookCreate,
) -> NotebookResponse:
    nb = Notebook(
        name=data.name,
        description=data.description,
        type=data.type,
        owner_id=user_id,
    )
    session.add(nb)
    session.commit()
    session.refresh(nb)
    return _to_response(session, nb)


def update_notebook(
    session: Session,
    nb: Notebook,
    data: NotebookUpdate,
) -> NotebookResponse:
    if data.name is not None:
        nb.name = data.name
    if data.description is not None:
        nb.description = data.description
    nb.updated_at = datetime.now(timezone.utc)
    session.add(nb)
    session.commit()
    session.refresh(nb)
    return _to_response(session, nb)


def delete_notebook(session: Session, nb: Notebook) -> None:
    # delete entries first
    entries = session.exec(
        select(NotebookEntry).where(NotebookEntry.notebook_id == nb.id)
    ).all()
    for e in entries:
        session.delete(e)
    session.delete(nb)
    session.commit()


def add_entry(
    session: Session,
    nb: Notebook,
    data: AddEntryRequest,
) -> NotebookEntryResponse:
    """Returns the entry. Raises ValueError if already exists."""
    entry = NotebookEntry(notebook_id=nb.id, char=data.char)
    session.add(entry)
    try:
        session.flush()
    except IntegrityError:
        session.rollback()
        raise ValueError(f"Từ này đã tồn tại trong sổ tay {nb.name}")
    # bump notebook updated_at
    nb.updated_at = datetime.now(timezone.utc)
    session.add(nb)
    session.commit()
    session.refresh(entry)
    return NotebookEntryResponse(
        id=entry.id,
        notebook_id=entry.notebook_id,
        char=entry.char,
        added_at=entry.added_at,
    )


def remove_entry(session: Session, nb: Notebook, char: str) -> bool:
    entry = session.exec(
        select(NotebookEntry)
        .where(NotebookEntry.notebook_id == nb.id, NotebookEntry.char == char)
    ).first()
    if entry is None:
        return False
    session.delete(entry)
    nb.updated_at = datetime.now(timezone.utc)
    session.add(nb)
    session.commit()
    return True
