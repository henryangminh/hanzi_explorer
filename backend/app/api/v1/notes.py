from fastapi import APIRouter, HTTPException, Response, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.note import NoteCreate, NoteUpdate, UserNoteResponse
from app.services import note_service

# Notes live under /dictionary/... for URL compatibility. This router must be included before the
# dictionary router so that /dictionary/notes is not captured by /dictionary/{char}.
router = APIRouter(prefix="/dictionary", tags=["notes"])


@router.get("/notes", response_model=list[UserNoteResponse])
def list_all_notes(current_user: CurrentUser, session: DbSession):
    """Get all notes of the current user across all characters."""
    return note_service.get_all_user_notes(session, current_user.id)


@router.get("/{char}/notes", response_model=list[UserNoteResponse])
def list_notes(char: str, current_user: CurrentUser, session: DbSession):
    return note_service.get_user_notes(session, current_user.id, char)


@router.post("/{char}/notes", response_model=UserNoteResponse, status_code=201)
def create_note(char: str, body: NoteCreate, current_user: CurrentUser, session: DbSession):
    return note_service.create_user_note(session, current_user.id, char, body)


@router.put("/{char}/notes/{note_id}", response_model=UserNoteResponse)
def update_note(char: str, note_id: int, body: NoteUpdate, current_user: CurrentUser, session: DbSession):
    note = note_service.update_user_note(session, current_user.id, note_id, body)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note


@router.delete("/{char}/notes/{note_id}", status_code=204)
def delete_note(char: str, note_id: int, current_user: CurrentUser, session: DbSession):
    if not note_service.delete_user_note(session, current_user.id, note_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return Response(status_code=204)
