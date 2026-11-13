"""User notes on characters/words. Display info (pinyin, Hán Việt) is computed once at write time."""
import json
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select

from app.models.note import UserNote
from app.schemas.note import NoteCreate, NoteUpdate, UserNoteResponse
from app.services.character_lookup import get_character, get_primary_reading
from app.services.sino_vn_service import compose_from_db


def _display_info(session: Session, char: str) -> tuple[str, list[str]]:
    """(primary pinyin with tone marks, Hán Việt readings) of a word, from the dictionary."""
    char_row = get_character(session, char)
    reading = get_primary_reading(session, char_row.id) if char_row else None
    if not reading:
        return '', []
    sino_vn = compose_from_db(session, char, reading.pinyin_numeric) if reading.pinyin_numeric else []
    return reading.pinyin or '', sino_vn


def _to_response(note: UserNote) -> UserNoteResponse:
    return UserNoteResponse(
        id=note.id,
        char=note.char,
        title=note.title,
        detail=note.detail,
        updated_at=note.updated_at.isoformat() if note.updated_at else None,
        pinyin=note.pinyin or '',
        sino_vn=json.loads(note.sino_vn_json) if note.sino_vn_json else [],
    )


def _get_own_note(session: Session, user_id: int, note_id: int) -> Optional[UserNote]:
    note = session.get(UserNote, note_id)
    return note if note and note.user_id == user_id else None


def get_all_user_notes(session: Session, user_id: int) -> list[UserNoteResponse]:
    notes = session.exec(
        select(UserNote)
        .where(UserNote.user_id == user_id)
        .where(UserNote.title != '')
        .order_by(UserNote.updated_at.desc())
    ).all()
    return [_to_response(n) for n in notes]


def get_user_notes(session: Session, user_id: int, char: str) -> list[UserNoteResponse]:
    notes = session.exec(
        select(UserNote)
        .where(UserNote.user_id == user_id)
        .where(UserNote.char == char)
        .order_by(UserNote.created_at)
    ).all()
    return [_to_response(n) for n in notes]


def create_user_note(session: Session, user_id: int, char: str, data: NoteCreate) -> UserNoteResponse:
    pinyin, sino_vn = _display_info(session, char)
    note = UserNote(
        user_id=user_id, char=char, title=data.title, detail=data.detail,
        pinyin=pinyin or None, sino_vn_json=json.dumps(sino_vn, ensure_ascii=False),
    )
    session.add(note)
    session.commit()
    session.refresh(note)
    return _to_response(note)


def update_user_note(session: Session, user_id: int, note_id: int, data: NoteUpdate) -> Optional[UserNoteResponse]:
    note = _get_own_note(session, user_id, note_id)
    if not note:
        return None
    note.title = data.title
    note.detail = data.detail
    note.updated_at = datetime.now(timezone.utc)
    session.add(note)
    session.commit()
    session.refresh(note)
    return _to_response(note)


def delete_user_note(session: Session, user_id: int, note_id: int) -> bool:
    note = _get_own_note(session, user_id, note_id)
    if not note:
        return False
    session.delete(note)
    session.commit()
    return True
