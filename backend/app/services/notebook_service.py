from datetime import datetime, timezone
from typing import Literal, Iterator

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select, func

from app.core.cedict_utils import clean_meaning
from app.core.pinyin import numeric_to_diacritic
from app.models.character import Character, PinyinReading
from app.models.flashcard import UserFlashcard
from app.models.notebook import Notebook, NotebookEntry
from app.schemas.notebook import (
    AddEntriesResponse,
    AddEntryRequest,
    NotebookCreate,
    NotebookEntryPreview,
    NotebookEntryResponse,
    NotebookResponse,
    NotebookUpdate,
)
from app.services.character_lookup import batch_brief_lookup, get_character, resolve_simplified
from app.services.sino_vn_service import compose_from_db

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


def _to_response(session: Session, nb: Notebook, user_id: int) -> NotebookResponse:
    count = session.exec(
        select(func.count(NotebookEntry.id)).where(NotebookEntry.notebook_id == nb.id)
    ).one()
    learned = session.exec(
        select(func.count(UserFlashcard.id))
        .join(NotebookEntry, NotebookEntry.char == UserFlashcard.char)
        .where(NotebookEntry.notebook_id == nb.id)
        .where(UserFlashcard.user_id == user_id)
        .where(UserFlashcard.status == "learned")
    ).one()
    not_learned = session.exec(
        select(func.count(UserFlashcard.id))
        .join(NotebookEntry, NotebookEntry.char == UserFlashcard.char)
        .where(NotebookEntry.notebook_id == nb.id)
        .where(UserFlashcard.user_id == user_id)
        .where(UserFlashcard.status == "not_learned")
    ).one()
    return NotebookResponse(
        id=nb.id,
        name=nb.name,
        description=nb.description,
        type=nb.type,
        owner_id=nb.owner_id,
        sort_order=nb.sort_order,
        entry_count=count,
        learned_count=learned,
        not_learned_count=not_learned,
        created_at=nb.created_at,
        updated_at=nb.updated_at,
    )


def list_notebooks(
    session: Session,
    user_id: int,
    sort: SortOrder = "updated_at_desc",
) -> list[NotebookResponse]:
    # Global notebooks: always sorted by sort_order ASC
    global_stmt = select(Notebook).where(Notebook.type == "global").order_by(Notebook.sort_order.asc())
    global_notebooks = session.exec(global_stmt).all()

    # Private notebooks: sorted by user-chosen sort param
    private_stmt = select(Notebook).where(Notebook.owner_id == user_id, Notebook.type == "private")
    private_stmt = _sort_notebooks(private_stmt, sort)
    private_notebooks = session.exec(private_stmt).all()

    all_notebooks = list(global_notebooks) + list(private_notebooks)
    return [_to_response(session, nb, user_id) for nb in all_notebooks]


def _assert_name_free(session: Session, name: str, type: str, owner_id: int, exclude_id: int | None = None) -> None:
    """A user's private notebooks have distinct names, and so do the global ones (ignoring case).
    Raises ValueError if the name is taken."""
    stmt = select(Notebook.name).where(Notebook.type == type)
    if type == "private":
        stmt = stmt.where(Notebook.owner_id == owner_id)
    if exclude_id is not None:
        stmt = stmt.where(Notebook.id != exclude_id)
    if any(n.casefold() == name.casefold() for n in session.exec(stmt)):
        raise ValueError(f"Đã có sổ tay tên {name}")


def create_notebook(
    session: Session,
    user_id: int,
    data: NotebookCreate,
) -> NotebookResponse:
    """Raises ValueError if the name is taken."""
    _assert_name_free(session, data.name, data.type, user_id)
    nb = Notebook(
        name=data.name,
        description=data.description,
        type=data.type,
        owner_id=user_id,
    )
    session.add(nb)
    session.commit()
    session.refresh(nb)
    return _to_response(session, nb, user_id)


def update_notebook(
    session: Session,
    nb: Notebook,
    data: NotebookUpdate,
    user_id: int,
) -> NotebookResponse:
    """Raises ValueError if the new name is taken."""
    if data.name is not None:
        _assert_name_free(session, data.name, nb.type, nb.owner_id, exclude_id=nb.id)
        nb.name = data.name
    if data.description is not None:
        nb.description = data.description
    if data.sort_order is not None:
        nb.sort_order = data.sort_order
    nb.updated_at = datetime.now(timezone.utc)
    session.add(nb)
    session.commit()
    session.refresh(nb)
    return _to_response(session, nb, user_id)


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
    # Traditional input is stored under its simplified headword; unknown words are stored as typed.
    entry = NotebookEntry(notebook_id=nb.id, char=resolve_simplified(session, data.char))
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


def add_entries(session: Session, nb: Notebook, chars: list[str]) -> AddEntriesResponse:
    """Add many dictionary words at once (traditional input is stored as simplified); unknown words are skipped."""
    present = set(session.exec(select(NotebookEntry.char).where(NotebookEntry.notebook_id == nb.id)).all())
    result = AddEntriesResponse(added=[], existing=[], unknown=[])
    for char in dict.fromkeys(c.strip() for c in chars if c.strip()):
        row = get_character(session, char)
        if row is None:
            result.unknown.append(char)
        elif row.simplified in present:
            result.existing.append(row.simplified)
        else:
            session.add(NotebookEntry(notebook_id=nb.id, char=row.simplified))
            present.add(row.simplified)
            result.added.append(row.simplified)
    if result.added:
        nb.updated_at = datetime.now(timezone.utc)
        session.add(nb)
        session.commit()
    return result


def remove_entry(session: Session, nb: Notebook, char: str) -> bool:
    entry = session.exec(
        select(NotebookEntry)
        .where(
            NotebookEntry.notebook_id == nb.id,
            NotebookEntry.char.in_({char, resolve_simplified(session, char)}),
        )
    ).first()
    if entry is None:
        return False
    session.delete(entry)
    nb.updated_at = datetime.now(timezone.utc)
    session.add(nb)
    session.commit()
    return True


def global_notebook_names_containing(session: Session, char: str) -> list[str]:
    """Names of global notebooks (HSK lists, ...) that contain the word, in either script."""
    candidates = {char, resolve_simplified(session, char)}
    return list(session.exec(
        select(Notebook.name)
        .join(NotebookEntry, NotebookEntry.notebook_id == Notebook.id)
        .where(NotebookEntry.char.in_(candidates), Notebook.type == "global")
        .distinct()
        .order_by(Notebook.name)
    ).all())


def stream_entries_preview(
    session: Session,
    notebook_id: int,
    sort: SortOrder = "updated_at_desc",
    chunk_size: int = 50,
) -> Iterator[NotebookEntryPreview]:
    # 1. Base entries + characters query (with sort). Outer join: a word may be missing from the dictionary.
    stmt = (
        select(NotebookEntry, Character)
        .outerjoin(Character, Character.simplified == NotebookEntry.char)
        .where(NotebookEntry.notebook_id == notebook_id)
    )
    if sort in ("name_asc", "name_desc"):
        min_id_subq = (
            select(func.min(PinyinReading.id).label("min_id"), PinyinReading.character_id)
            .group_by(PinyinReading.character_id)
            .subquery()
        )
        first_pinyin_subq = (
            select(PinyinReading.character_id, PinyinReading.pinyin_numeric.label("first_pinyin"))
            .join(min_id_subq, PinyinReading.id == min_id_subq.c.min_id)
            .subquery()
        )
        stmt = stmt.outerjoin(first_pinyin_subq, first_pinyin_subq.c.character_id == Character.id)
        if sort == "name_asc":
            stmt = stmt.order_by(func.lower(first_pinyin_subq.c.first_pinyin).asc())
        else:
            stmt = stmt.order_by(func.lower(first_pinyin_subq.c.first_pinyin).desc())
    elif sort in ("created_at_asc", "updated_at_asc"):
        stmt = stmt.order_by(NotebookEntry.added_at.asc())
    else:
        stmt = stmt.order_by(NotebookEntry.added_at.desc())

    rows = session.exec(stmt).all()
    if not rows:
        return

    # Yield in batches to avoid fetching definitions for all 2000 entries at once
    for i in range(0, len(rows), chunk_size):
        chunk = rows[i:i + chunk_size]
        char_ids = [char.id for _, char in chunk if char]

        # 2. Pinyin readings + first CC-CEDICT / CVDICT definitions for chunk
        pinyins_by_char, cedict_by_char, cvdict_by_char = batch_brief_lookup(session, char_ids)

        # Yield entries in chunk
        for entry, char in chunk:
            if char is None:
                yield NotebookEntryPreview(id=entry.id, char=entry.char, added_at=str(entry.added_at))
                continue
            yield NotebookEntryPreview(
                id=entry.id,
                char=char.simplified,
                added_at=str(entry.added_at),
                traditional=char.traditional if char.traditional and char.traditional != char.simplified else None,
                cedict_brief=clean_meaning(cedict_by_char[char.id]).split(";")[0].strip() if char.id in cedict_by_char else None,
                cvdict_brief=cvdict_by_char[char.id].split("/")[0].strip() if char.id in cvdict_by_char else None,
                pinyins=[numeric_to_diacritic(p) for p in pinyins_by_char.get(char.id, [])],
                # Hán Việt of the primary reading, composed like the dictionary and flashcards do
                sino_vn=compose_from_db(session, char.simplified, pinyins_by_char[char.id][0]) if pinyins_by_char.get(char.id) else [],
                is_separable=char.is_separable,
            )
