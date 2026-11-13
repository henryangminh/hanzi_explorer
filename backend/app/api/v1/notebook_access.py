"""Notebook permission checks shared by the notebook and flashcard routers."""
from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.notebook import Notebook
from app.models.user import User


def get_notebook_or_404(session: Session, notebook_id: int) -> Notebook:
    nb = session.get(Notebook, notebook_id)
    if nb is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found")
    return nb


def assert_can_edit(nb: Notebook, user: User) -> None:
    if nb.type == "global" and not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ admin mới có thể chỉnh sửa sổ tay chung")
    if nb.type == "private" and nb.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền chỉnh sửa sổ tay này")


def assert_can_view(nb: Notebook, user: User) -> None:
    if nb.type == "private" and nb.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xem sổ tay này")
