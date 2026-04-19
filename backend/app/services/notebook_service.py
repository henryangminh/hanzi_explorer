from datetime import datetime, timezone
from typing import Literal, Optional

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select, func

from app.core.cedict_utils import clean_meaning
from app.core.pinyin import numeric_to_diacritic
from app.models.character import Character, Definition, DictionarySource, PinyinReading
from app.models.notebook import Notebook, NotebookEntry
from app.models.sino_vn import SinoVietnamese
from app.schemas.notebook import (
    AddEntryRequest,
    NotebookCreate,
    NotebookDetail,
    NotebookEntryPreview,
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
        sort_order=nb.sort_order,
        entry_count=count,
        created_at=nb.created_at,
        updated_at=nb.updated_at,
    )


def _get_or_create_character(session: Session, char: str) -> Character:
    """Lookup character by simplified or traditional form, create stub if not found."""
    c = session.exec(select(Character).where(Character.simplified == char)).first()
    if not c:
        c = session.exec(select(Character).where(Character.traditional == char)).first()
    if not c:
        c = Character(simplified=char)
        session.add(c)
        session.flush()
    return c


def list_notebooks(
    session: Session,
    user_id: int,
    sort: SortOrder = "updated_at_desc",
) -> list[NotebookResponse]:
    # Global notebooks: always sorted by sort_order ASC
    global_stmt = select(Notebook).where(Notebook.type == "global").order_by(Notebook.sort_order.asc())
    global_notebooks = session.exec(global_stmt).all()

    # Private notebooks: sorted by user-chosen sort param
    private_stmt = select(Notebook).where(Notebook.owner_id == user_id)
    private_stmt = _sort_notebooks(private_stmt, sort)
    private_notebooks = session.exec(private_stmt).all()

    all_notebooks = list(global_notebooks) + list(private_notebooks)
    return [_to_response(session, nb) for nb in all_notebooks]


def get_notebook(session: Session, notebook_id: int, user_id: int) -> Optional[NotebookDetail]:
    nb = session.get(Notebook, notebook_id)
    if nb is None:
        return None
    if nb.type == "private" and nb.owner_id != user_id:
        return None
    rows = session.exec(
        select(NotebookEntry, Character)
        .join(Character, NotebookEntry.char_id == Character.id)
        .where(NotebookEntry.notebook_id == notebook_id)
        .order_by(NotebookEntry.added_at.desc())
    ).all()
    entry_responses = [
        NotebookEntryResponse(
            id=entry.id,
            notebook_id=entry.notebook_id,
            char=char.simplified,
            added_at=entry.added_at,
        )
        for entry, char in rows
    ]
    return NotebookDetail(
        id=nb.id,
        name=nb.name,
        description=nb.description,
        type=nb.type,
        owner_id=nb.owner_id,
        entry_count=len(rows),
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
    if data.sort_order is not None:
        nb.sort_order = data.sort_order
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
    char_row = _get_or_create_character(session, data.char)
    entry = NotebookEntry(notebook_id=nb.id, char_id=char_row.id)
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
        char=char_row.simplified,
        added_at=entry.added_at,
    )


def remove_entry(session: Session, nb: Notebook, char: str) -> bool:
    char_row = session.exec(
        select(Character).where(
            (Character.simplified == char) | (Character.traditional == char)
        )
    ).first()
    if not char_row:
        return False
    entry = session.exec(
        select(NotebookEntry)
        .where(NotebookEntry.notebook_id == nb.id, NotebookEntry.char_id == char_row.id)
    ).first()
    if entry is None:
        return False
    session.delete(entry)
    nb.updated_at = datetime.now(timezone.utc)
    session.add(nb)
    session.commit()
    return True


def get_entries_preview(
    session: Session,
    notebook_id: int,
    sort: SortOrder = "updated_at_desc",
) -> list[NotebookEntryPreview]:
    # 1. Entries + characters (with sort)
    stmt = (
        select(NotebookEntry, Character)
        .join(Character, NotebookEntry.char_id == Character.id)
        .where(NotebookEntry.notebook_id == notebook_id)
    )
    if sort == "name_asc":
        stmt = stmt.order_by(Character.simplified.asc())
    elif sort == "name_desc":
        stmt = stmt.order_by(Character.simplified.desc())
    elif sort in ("created_at_asc", "updated_at_asc"):
        stmt = stmt.order_by(NotebookEntry.added_at.asc())
    else:
        stmt = stmt.order_by(NotebookEntry.added_at.desc())

    rows = session.exec(stmt).all()
    if not rows:
        return []

    char_ids = [char.id for _, char in rows]

    # 2. Dictionary source IDs
    sources = session.exec(
        select(DictionarySource).where(DictionarySource.name.in_(["CC-CEDICT", "CVDICT"]))
    ).all()
    src_by_name = {s.name: s.id for s in sources}
    cedict_id = src_by_name.get("CC-CEDICT", -1)
    cvdict_id = src_by_name.get("CVDICT", -1)

    # 3. All pinyin readings for these characters, ordered by id (primary reading first)
    all_pinyins = session.exec(
        select(PinyinReading)
        .where(PinyinReading.character_id.in_(char_ids))
        .order_by(PinyinReading.character_id, PinyinReading.id)
    ).all()

    # Group by character, deduplicate readings preserving order
    pinyins_by_char: dict[int, list[str]] = {}
    for pr in all_pinyins:
        seen = pinyins_by_char.setdefault(pr.character_id, [])
        if pr.pinyin_numeric and pr.pinyin_numeric not in seen:
            seen.append(pr.pinyin_numeric)

    # 4. First CC-CEDICT (en) definition per character
    en_defs = session.exec(
        select(Definition)
        .where(
            Definition.character_id.in_(char_ids),
            Definition.source_id == cedict_id,
            Definition.language == "en",
        )
        .order_by(Definition.character_id, Definition.id)
    ).all()
    cedict_by_char: dict[int, str] = {}
    for d in en_defs:
        cedict_by_char.setdefault(d.character_id, d.meaning_text)

    # 5. First CVDICT (vi) definition per character
    vi_defs = session.exec(
        select(Definition)
        .where(
            Definition.character_id.in_(char_ids),
            Definition.source_id == cvdict_id,
            Definition.language == "vi",
        )
        .order_by(Definition.character_id, Definition.id)
    ).all()
    cvdict_by_char: dict[int, str] = {}
    for d in vi_defs:
        cvdict_by_char.setdefault(d.character_id, d.meaning_text)

    # 6. Sino-Vietnamese matched to each character's primary pinyin
    first_pinyin_by_char = {
        char_id: readings[0]
        for char_id, readings in pinyins_by_char.items()
        if readings
    }
    sv_rows = session.exec(
        select(SinoVietnamese).where(SinoVietnamese.character_id.in_(char_ids))
    ).all()
    sino_vn_by_char: dict[int, list[str]] = {}
    for sv in sv_rows:
        if sv.pinyin == first_pinyin_by_char.get(sv.character_id):
            values = sino_vn_by_char.setdefault(sv.character_id, [])
            values.extend(v.strip() for v in sv.hanviet.split("/") if v.strip())

    # 7. Build response
    return [
        NotebookEntryPreview(
            id=entry.id,
            char=char.simplified,
            added_at=str(entry.added_at),
            traditional=char.traditional if char.traditional and char.traditional != char.simplified else None,
            cedict_brief=clean_meaning(cedict_by_char[char.id]).split(";")[0].strip() if char.id in cedict_by_char else None,
            cvdict_brief=cvdict_by_char[char.id].split("/")[0].strip() if char.id in cvdict_by_char else None,
            pinyins=[numeric_to_diacritic(p) for p in pinyins_by_char.get(char.id, [])],
            sino_vn=sino_vn_by_char.get(char.id, []),
            is_separable=char.is_separable,
        )
        for entry, char in rows
    ]
