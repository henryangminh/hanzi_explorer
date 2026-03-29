from fastapi import APIRouter
from app.api.v1 import auth, users, dictionary, radicals, settings

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(users.router)
router.include_router(dictionary.router)
router.include_router(radicals.router)
router.include_router(settings.router)
