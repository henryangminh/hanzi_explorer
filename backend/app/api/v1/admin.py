from typing import List

from fastapi import APIRouter, HTTPException, status
from app.core.deps import AdminUser, DbSession
from app.schemas.user import UserPublic, AdminUserCreate, AdminUserUpdate
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=List[UserPublic])
def list_users(current_admin: AdminUser, session: DbSession):
    """
    List all users. Admin only.
    """
    return admin_service.get_users(session)


@router.post("/users", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def create_user(body: AdminUserCreate, current_admin: AdminUser, session: DbSession):
    """
    Create a new user. Admin only.
    """
    try:
        user = admin_service.create_user(session, body)
        return user
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.patch("/users/{user_id}", response_model=UserPublic)
def update_user(user_id: int, body: AdminUserUpdate, current_admin: AdminUser, session: DbSession):
    """
    Update a user. Admin only.
    """
    user = admin_service.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    return admin_service.update_user(session, user, body)


@router.delete("/users/{user_id}", response_model=UserPublic)
def delete_user(user_id: int, current_admin: AdminUser, session: DbSession):
    """
    Soft delete a user. Admin only.
    """
    if user_id == current_admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete yourself")
        
    user = admin_service.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    return admin_service.soft_delete_user(session, user)

@router.post("/users/{user_id}/restore", response_model=UserPublic)
def restore_user(user_id: int, current_admin: AdminUser, session: DbSession):
    """
    Restore a soft deleted user. Admin only.
    """
    user = admin_service.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    return admin_service.restore_user(session, user)
