from datetime import datetime, timezone

from sqlalchemy import text
from sqlmodel import Session, select

from app.core.cedict_utils import clean_meaning
from app.core.pinyin import numeric_to_diacritic
from app.models.note import UserFlashcard
from app.schemas.notebook import FlashcardCardResponse, FlashcardStatusUpdate


def _fetch_source_ids(session: Session) -> tuple[int, int]:
    rows = session.execute(
        text("SELECT name, id FROM dictionary_sources WHERE name IN ('CC-CEDICT', 'CVDICT')")
    ).fetchall()
    src = {r[0]: r[1] for r in rows}
    return src.get("CC-CEDICT", -1), src.get("CVDICT", -1)


def _cedict_brief(raw: str | None) -> str | None:
    if not raw:
        return None
    return clean_meaning(raw).split(";")[0].strip()


def _cvdict_brief(raw: str | None) -> str | None:
    if not raw:
        return None
    return raw.split("/")[0].strip()


def _pinyins(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [numeric_to_diacritic(p.strip()) for p in raw.split("|||") if p.strip()]


def _rows_to_responses(rows) -> list[FlashcardCardResponse]:
    return [
        FlashcardCardResponse(
            char=row[0],
            pinyins=_pinyins(row[1]),
            cedict_brief=_cedict_brief(row[2]),
            cvdict_brief=_cvdict_brief(row[3]),
            status=row[4],
        )
        for row in rows
    ]


def get_flashcards(
    session: Session,
    notebook_ids: list[int],
    user_id: int,
    count: int,
) -> list[FlashcardCardResponse]:
    cedict_id, cvdict_id = _fetch_source_ids(session)
    ids_str = ",".join(str(i) for i in notebook_ids)

    rows = session.execute(
        text(f"""
            WITH sampled AS (
                SELECT DISTINCT char_id
                FROM notebook_entries
                WHERE notebook_id IN ({ids_str})
                ORDER BY RANDOM()
                LIMIT :count
            ),
            source_chars AS (
                SELECT s.char_id, uf.status
                FROM sampled s
                JOIN characters c ON c.id = s.char_id
                LEFT JOIN user_flashcards uf ON uf.user_id = :user_id AND uf.char = c.simplified
            ),
            en_min AS (
                SELECT character_id, MIN(id) AS min_id
                FROM definitions
                WHERE source_id = :cedict_id AND language = 'en'
                  AND character_id IN (SELECT char_id FROM source_chars)
                GROUP BY character_id
            ),
            vi_min AS (
                SELECT character_id, MIN(id) AS min_id
                FROM definitions
                WHERE source_id = :cvdict_id AND language = 'vi'
                  AND character_id IN (SELECT char_id FROM source_chars)
                GROUP BY character_id
            ),
            py AS (
                SELECT pr.character_id,
                       GROUP_CONCAT(pr.pinyin_numeric, '|||') AS pinyins_raw
                FROM (
                    SELECT character_id, pinyin_numeric
                    FROM pinyin_readings
                    WHERE character_id IN (SELECT char_id FROM source_chars)
                    GROUP BY character_id, pinyin_numeric
                    ORDER BY character_id, MIN(id)
                ) pr
                GROUP BY pr.character_id
            )
            SELECT c.simplified, py.pinyins_raw,
                   en_d.meaning_text, vi_d.meaning_text, sc.status
            FROM source_chars sc
            JOIN characters c ON c.id = sc.char_id
            LEFT JOIN en_min   ON en_min.character_id = sc.char_id
            LEFT JOIN definitions en_d ON en_d.id     = en_min.min_id
            LEFT JOIN vi_min   ON vi_min.character_id = sc.char_id
            LEFT JOIN definitions vi_d ON vi_d.id     = vi_min.min_id
            LEFT JOIN py       ON py.character_id      = sc.char_id
        """),
        {"count": count, "cedict_id": cedict_id, "cvdict_id": cvdict_id, "user_id": user_id},
    ).fetchall()
    return _rows_to_responses(rows)


def get_marked_flashcards(
    session: Session,
    user_id: int,
) -> list[FlashcardCardResponse]:
    cedict_id, cvdict_id = _fetch_source_ids(session)

    rows = session.execute(
        text("""
            WITH source_chars AS (
                SELECT c.id AS char_id, uf.status
                FROM user_flashcards uf
                JOIN characters c ON c.simplified = uf.char
                WHERE uf.user_id = :user_id AND uf.status IS NOT NULL
            ),
            en_min AS (
                SELECT character_id, MIN(id) AS min_id
                FROM definitions
                WHERE source_id = :cedict_id AND language = 'en'
                  AND character_id IN (SELECT char_id FROM source_chars)
                GROUP BY character_id
            ),
            vi_min AS (
                SELECT character_id, MIN(id) AS min_id
                FROM definitions
                WHERE source_id = :cvdict_id AND language = 'vi'
                  AND character_id IN (SELECT char_id FROM source_chars)
                GROUP BY character_id
            ),
            py AS (
                SELECT pr.character_id,
                       GROUP_CONCAT(pr.pinyin_numeric, '|||') AS pinyins_raw
                FROM (
                    SELECT character_id, pinyin_numeric
                    FROM pinyin_readings
                    WHERE character_id IN (SELECT char_id FROM source_chars)
                    GROUP BY character_id, pinyin_numeric
                    ORDER BY character_id, MIN(id)
                ) pr
                GROUP BY pr.character_id
            )
            SELECT c.simplified, py.pinyins_raw,
                   en_d.meaning_text, vi_d.meaning_text, sc.status
            FROM source_chars sc
            JOIN characters c ON c.id = sc.char_id
            LEFT JOIN en_min   ON en_min.character_id = sc.char_id
            LEFT JOIN definitions en_d ON en_d.id     = en_min.min_id
            LEFT JOIN vi_min   ON vi_min.character_id = sc.char_id
            LEFT JOIN definitions vi_d ON vi_d.id     = vi_min.min_id
            LEFT JOIN py       ON py.character_id      = sc.char_id
            ORDER BY sc.status, c.simplified
        """),
        {"user_id": user_id, "cedict_id": cedict_id, "cvdict_id": cvdict_id},
    ).fetchall()
    return _rows_to_responses(rows)


def get_flashcard_statuses(
    session: Session,
    user_id: int,
    chars: list[str],
) -> dict[str, str | None]:
    if not chars:
        return {}
    rows = session.exec(
        select(UserFlashcard)
        .where(UserFlashcard.user_id == user_id)
        .where(UserFlashcard.char.in_(chars))
    ).all()
    return {r.char: r.status for r in rows}


def update_flashcard_status(
    session: Session,
    user_id: int,
    data: FlashcardStatusUpdate,
) -> None:
    fc = session.exec(
        select(UserFlashcard)
        .where(UserFlashcard.user_id == user_id)
        .where(UserFlashcard.char == data.char)
    ).first()

    if fc:
        fc.status = data.status
        fc.updated_at = datetime.now(timezone.utc)
        session.add(fc)
        session.commit()
    elif data.status is not None:
        session.add(UserFlashcard(user_id=user_id, char=data.char, status=data.status))
        session.commit()
