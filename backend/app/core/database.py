from datetime import date
from pathlib import Path

from sqlalchemy import event, inspect
from sqlmodel import SQLModel, create_engine, Session

from app.core.config import get_settings
from app.models import DICTIONARY_SCHEMA

settings = get_settings()

# app.db is the main (read/write) database. dictionary.db is attached read-only under the
# "dictionary" schema, so ORM joins across both work, but nothing in the app can write to it.
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False, "uri": True},  # uri: allows "file:...?mode=ro" in ATTACH
    echo=settings.app_env == "development",
)

_DICTIONARY_URI = f"file:{Path(settings.dictionary_db_path).resolve()}?mode=ro"


@event.listens_for(engine, "connect")
def _on_connect(dbapi_connection, connection_record):
    dbapi_connection.execute("PRAGMA journal_mode=WAL")
    dbapi_connection.execute("PRAGMA busy_timeout=5000")
    dbapi_connection.execute("PRAGMA cache_size=-32000")   # 32 MB page cache
    dbapi_connection.execute("PRAGMA temp_store=MEMORY")
    dbapi_connection.execute(f"ATTACH DATABASE ? AS {DICTIONARY_SCHEMA}", (_DICTIONARY_URI,))


def init_db() -> None:
    if not Path(settings.dictionary_db_path).exists():
        raise RuntimeError(
            f"Dictionary database not found at {settings.dictionary_db_path}. "
            "Build it with the scripts in migration/ (see migration/README.md)."
        )
    # Import all models here so SQLModel metadata is fully populated
    from app.models import user, character, radical, note, flashcard, notebook, sino_vn, search_history, synonym_antonym, wotd, cache, study_day, review, word_report  # noqa: F401
    # Only create app tables — dictionary tables are owned by migration/schema/dictionary.sql
    app_tables = [t for t in SQLModel.metadata.sorted_tables if t.schema != DICTIONARY_SCHEMA]
    existing = set(inspect(engine).get_table_names())
    SQLModel.metadata.create_all(engine, tables=app_tables)
    _backfill_new_tables(existing)


def _backfill_new_tables(existing: set[str]) -> None:
    """Seed tables added after users already had data — once, when the table is first created."""
    from app.services import review_service, study_day_service
    with Session(engine) as session:
        if "study_days" not in existing:
            study_day_service.backfill_from_wotd(session)
        if "review_items" not in existing:
            review_service.backfill_from_wotd(session, date.today().isoformat())


def get_session():
    with Session(engine) as session:
        yield session
