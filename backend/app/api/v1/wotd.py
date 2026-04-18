import json

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.deps import CurrentUser, DbSession

router = APIRouter(prefix="/wotd", tags=["wotd"])


class WOTDSaveRequest(BaseModel):
    date: str        # YYYY-MM-DD (local date from client)
    chars: list[str]


@router.post("", status_code=200)
def save_wotd(data: WOTDSaveRequest, session: DbSession, user: CurrentUser):
    """Idempotently save today's WOTD. Skips if a record for this date already exists."""
    from sqlmodel import select
    from app.models.wotd import WOTDHistory

    existing = session.exec(
        select(WOTDHistory)
        .where(WOTDHistory.user_id == user.id)
        .where(WOTDHistory.date == data.date)
    ).first()

    if existing:
        return {"saved": False}

    record = WOTDHistory(
        user_id=user.id,
        date=data.date,
        chars_json=json.dumps(data.chars, ensure_ascii=False),
    )
    session.add(record)
    session.commit()
    return {"saved": True}


@router.get("/dates", response_model=list[str])
def get_wotd_dates(session: DbSession, user: CurrentUser):
    """Return all dates for which user has saved WOTD, newest first."""
    from sqlalchemy import text
    rows = session.execute(
        text("SELECT date FROM wotd_history WHERE user_id = :uid ORDER BY date DESC"),
        {"uid": user.id},
    ).fetchall()
    return [row[0] for row in rows]


@router.get("/{date}")
def get_wotd_for_date(date: str, session: DbSession, user: CurrentUser):
    """Return flashcard entries for a specific saved date with current status."""
    from sqlalchemy import text
    from sqlmodel import select
    from app.models.wotd import WOTDHistory
    from app.schemas.notebook import FlashcardCardResponse
    from app.core.cedict_utils import clean_meaning
    from app.core.pinyin import numeric_to_diacritic

    record = session.exec(
        select(WOTDHistory)
        .where(WOTDHistory.user_id == user.id)
        .where(WOTDHistory.date == date)
    ).first()

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No WOTD for this date")

    chars: list[str] = json.loads(record.chars_json)
    if not chars:
        return []

    src_row = session.execute(text(
        "SELECT name, id FROM dictionary_sources WHERE name IN ('CC-CEDICT', 'CVDICT')"
    )).fetchall()
    src_ids = {row[0]: row[1] for row in src_row}
    cedict_id = src_ids.get("CC-CEDICT", -1)
    cvdict_id = src_ids.get("CVDICT", -1)

    rows = session.execute(
        text("""
            WITH target_chars AS (
                SELECT c.id AS char_id, c.simplified
                FROM characters c
                WHERE c.simplified IN (SELECT value FROM json_each(:chars_json))
            ),
            en_min AS (
                SELECT character_id, MIN(id) AS min_id
                FROM definitions
                WHERE source_id = :cedict_id AND language = 'en'
                  AND character_id IN (SELECT char_id FROM target_chars)
                GROUP BY character_id
            ),
            vi_min AS (
                SELECT character_id, MIN(id) AS min_id
                FROM definitions
                WHERE source_id = :cvdict_id AND language = 'vi'
                  AND character_id IN (SELECT char_id FROM target_chars)
                GROUP BY character_id
            ),
            py AS (
                SELECT pr.character_id,
                       GROUP_CONCAT(pr.pinyin_numeric, '|||') AS pinyins_raw
                FROM (
                    SELECT character_id, pinyin_numeric
                    FROM pinyin_readings
                    WHERE character_id IN (SELECT char_id FROM target_chars)
                    GROUP BY character_id, pinyin_numeric
                    ORDER BY character_id, MIN(id)
                ) pr
                GROUP BY pr.character_id
            )
            SELECT c.simplified,
                   py.pinyins_raw,
                   en_d.meaning_text AS cedict_raw,
                   vi_d.meaning_text AS cvdict_raw,
                   uf.status
            FROM target_chars tc
            JOIN characters c ON c.id = tc.char_id
            LEFT JOIN en_min   ON en_min.character_id = tc.char_id
            LEFT JOIN definitions en_d ON en_d.id     = en_min.min_id
            LEFT JOIN vi_min   ON vi_min.character_id = tc.char_id
            LEFT JOIN definitions vi_d ON vi_d.id     = vi_min.min_id
            LEFT JOIN py       ON py.character_id      = tc.char_id
            LEFT JOIN user_flashcards uf ON uf.user_id = :user_id AND uf.char = c.simplified
        """),
        {
            "chars_json": record.chars_json,
            "cedict_id": cedict_id,
            "cvdict_id": cvdict_id,
            "user_id": user.id,
        },
    ).fetchall()

    char_order = {c: i for i, c in enumerate(chars)}

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

    results = [
        FlashcardCardResponse(
            char=row[0],
            pinyins=_pinyins(row[1]),
            cedict_brief=_cedict_brief(row[2]),
            cvdict_brief=_cvdict_brief(row[3]),
            status=row[4],
        )
        for row in rows
    ]
    results.sort(key=lambda r: char_order.get(r.char, 999))
    return results
