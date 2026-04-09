from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import event
from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # needed for SQLite
    echo=settings.app_env == "development",
)


@event.listens_for(engine, "connect")
def set_sqlite_journal_mode(dbapi_connection, connection_record):
    dbapi_connection.execute("PRAGMA journal_mode=DELETE")


def init_db() -> None:
    # Import all models here so SQLModel metadata is fully populated
    from app.models import user, character, note, notebook, sino_vn  # noqa: F401
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
