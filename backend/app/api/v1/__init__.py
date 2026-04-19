from fastapi import APIRouter
from app.api.v1 import auth, users, dictionary, radicals, settings, notebooks, flashcards, admin, search_history, wotd

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(users.router)
router.include_router(dictionary.router)
router.include_router(radicals.router)
router.include_router(settings.router)
router.include_router(flashcards.router)
router.include_router(notebooks.router)
router.include_router(admin.router)
router.include_router(search_history.router)
router.include_router(wotd.router)
