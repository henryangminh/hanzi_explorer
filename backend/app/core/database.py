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
    dbapi_connection.execute("PRAGMA journal_mode=WAL")
    dbapi_connection.execute("PRAGMA busy_timeout=5000")
    dbapi_connection.execute("PRAGMA cache_size=-32000")   # 32 MB page cache
    dbapi_connection.execute("PRAGMA temp_store=MEMORY")


def init_db() -> None:
    # Import all models here so SQLModel metadata is fully populated
    from app.models import user, character, note, notebook, sino_vn, search_history, synonym_antonym, wotd  # noqa: F401
    SQLModel.metadata.create_all(engine)
    _run_migrations()


def _run_migrations() -> None:
    """Idempotently apply schema migrations."""
    from sqlalchemy import text
    import json
    with Session(engine) as session:
        cols = {row[1] for row in session.execute(text("PRAGMA table_info(user_notes)")).fetchall()}
        if 'flashcard_status' not in cols:
            session.execute(text("ALTER TABLE user_notes ADD COLUMN flashcard_status TEXT"))
            session.commit()

        if 'pinyin' not in cols:
            session.execute(text("ALTER TABLE user_notes ADD COLUMN pinyin TEXT"))
            session.commit()
        if 'sino_vn_json' not in cols:
            session.execute(text("ALTER TABLE user_notes ADD COLUMN sino_vn_json TEXT"))
            session.commit()

        # Compound index to avoid temp B-tree sort on the main notes query
        session.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_user_notes_user_updated "
            "ON user_notes(user_id, updated_at DESC)"
        ))
        session.commit()

        # Backfill display info for existing notes
        rows = session.execute(
            text("SELECT id, char FROM user_notes WHERE pinyin IS NULL AND title != ''")
        ).fetchall()
        if rows:
            from app.services.dictionary_service import _get_char_display_info
            char_info: dict = {}
            for _, char in rows:
                if char not in char_info:
                    char_info[char] = _get_char_display_info(session, char)
            for note_id, char in rows:
                pinyin, sino_vn = char_info.get(char, ('', []))
                session.execute(
                    text("UPDATE user_notes SET pinyin = :p, sino_vn_json = :sv WHERE id = :id"),
                    {"p": pinyin or None, "sv": json.dumps(sino_vn, ensure_ascii=False), "id": note_id},
                )
            session.commit()

        # Migrate flashcard status data from user_notes → user_flashcards
        fc_tables = {row[0] for row in session.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()}
        if 'user_flashcards' in fc_tables:
            session.execute(text("""
                INSERT OR IGNORE INTO user_flashcards (user_id, char, status, created_at, updated_at)
                SELECT user_id, char, flashcard_status, created_at, updated_at
                FROM user_notes
                WHERE flashcard_status IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM user_flashcards uf
                      WHERE uf.user_id = user_notes.user_id AND uf.char = user_notes.char
                  )
            """))
            # Remove flashcard-only rows from user_notes (empty title = created purely for flashcard tracking)
            session.execute(text("""
                DELETE FROM user_notes
                WHERE title = '' AND flashcard_status IS NOT NULL
            """))
            session.commit()


def get_session():
    with Session(engine) as session:
        yield session
