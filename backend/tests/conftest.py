"""Tests run against a throwaway app.db (and an empty dictionary.db) in a temp folder, never the real data."""
import os
import sqlite3
import tempfile
from pathlib import Path

_tmp = Path(tempfile.mkdtemp(prefix="hanzi-tests-"))
sqlite3.connect(_tmp / "dictionary.db").close()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp / 'app.db'}"
os.environ["DICTIONARY_DB_PATH"] = str(_tmp / "dictionary.db")
os.environ["SECRET_KEY"] = "test-secret"
os.environ["APP_ENV"] = "test"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlmodel import Session, SQLModel  # noqa: E402

from app.core.database import engine  # noqa: E402
from app.core.security import create_access_token, hash_password  # noqa: E402
from app.models import DICTIONARY_SCHEMA  # noqa: E402
from app.models import user, note, flashcard, notebook, search_history, wotd, cache, study_day, review, word_report  # noqa: E402, F401
from app.models.user import User  # noqa: E402
from main import app  # noqa: E402

_APP_TABLES = [t for t in SQLModel.metadata.sorted_tables if t.schema != DICTIONARY_SCHEMA]


@pytest.fixture
def session():
    SQLModel.metadata.drop_all(engine, tables=_APP_TABLES)
    SQLModel.metadata.create_all(engine, tables=_APP_TABLES)
    with Session(engine) as s:
        yield s


@pytest.fixture
def client(session):
    return TestClient(app)  # not as a context manager: skips startup (init_db) on purpose


@pytest.fixture
def make_user(session):
    def make(username: str, password: str = "secret-pass", is_admin: bool = False) -> User:
        u = User(username=username, hashed_password=hash_password(password), display_name=username, is_admin=is_admin)
        session.add(u)
        session.commit()
        session.refresh(u)
        return u
    return make


def auth(u: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(subject=str(u.id))}"}
