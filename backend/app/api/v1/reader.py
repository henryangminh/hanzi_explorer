from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.schemas.reader import ReaderToken, SegmentRequest
from app.services import segment_service

router = APIRouter(prefix="/reader", tags=["reader"])


@router.post("/segment", response_model=list[ReaderToken])
def segment(data: SegmentRequest, session: DbSession, user: CurrentUser):
    """Split a pasted text into words with pinyin, for the reading assistant."""
    return segment_service.segment_text(session, user.id, data.text)
