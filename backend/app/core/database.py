from sqlmodel import SQLModel, create_engine, Session
from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # needed for SQLite
    echo=settings.app_env == "development",
)


def init_db() -> None:
    # Import all models here so SQLModel metadata is fully populated
    from app.models import user, character, note, notebook  # noqa: F401
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
