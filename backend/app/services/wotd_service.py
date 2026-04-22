import json

from sqlmodel import Session, select

from app.core.cedict_utils import clean_meaning
from app.core.pinyin import numeric_to_diacritic
from app.models.character import Character, Definition, DictionarySource, PinyinReading
from app.models.note import UserFlashcard
from app.models.wotd import WOTDHistory
from app.schemas.notebook import FlashcardCardResponse


def save_wotd(session: Session, user_id: int, date: str, chars: list[str]) -> bool:
    """Idempotently save today's WOTD. Returns True if saved, False if already exists."""
    existing = session.exec(
        select(WOTDHistory)
        .where(WOTDHistory.user_id == user_id)
        .where(WOTDHistory.date == date)
    ).first()
    if existing:
        return False
    session.add(WOTDHistory(
        user_id=user_id,
        date=date,
        chars_json=json.dumps(chars, ensure_ascii=False),
    ))
    session.commit()
    return True


def get_wotd_dates(session: Session, user_id: int) -> list[str]:
    records = session.exec(
        select(WOTDHistory)
        .where(WOTDHistory.user_id == user_id)
        .order_by(WOTDHistory.date.desc())
    ).all()
    return [r.date for r in records]


def get_wotd_for_date(
    session: Session,
    user_id: int,
    date: str,
) -> list[FlashcardCardResponse] | None:
    """Return flashcard entries for a specific saved WOTD date. Returns None if date not found."""
    record = session.exec(
        select(WOTDHistory)
        .where(WOTDHistory.user_id == user_id)
        .where(WOTDHistory.date == date)
    ).first()
    if not record:
        return None

    chars: list[str] = json.loads(record.chars_json)
    if not chars:
        return []

    # 1. Resolve characters
    char_rows = session.exec(
        select(Character).where(Character.simplified.in_(chars))
    ).all()
    char_by_simplified = {c.simplified: c for c in char_rows}
    char_ids = [c.id for c in char_rows]

    # 2. Dictionary source IDs
    sources = session.exec(
        select(DictionarySource).where(DictionarySource.name.in_(["CC-CEDICT", "CVDICT"]))
    ).all()
    src_by_name = {s.name: s.id for s in sources}
    cedict_id = src_by_name.get("CC-CEDICT", -1)
    cvdict_id = src_by_name.get("CVDICT", -1)

    # 3. Pinyin readings (all, deduplicated, primary first)
    all_pinyins = session.exec(
        select(PinyinReading)
        .where(PinyinReading.character_id.in_(char_ids))
        .order_by(PinyinReading.character_id, PinyinReading.id)
    ).all()
    pinyins_by_char: dict[int, list[str]] = {}
    for pr in all_pinyins:
        seen = pinyins_by_char.setdefault(pr.character_id, [])
        if pr.pinyin_numeric and pr.pinyin_numeric not in seen:
            seen.append(pr.pinyin_numeric)

    # 4. First CC-CEDICT (en) definition per character
    en_defs = session.exec(
        select(Definition)
        .where(
            Definition.character_id.in_(char_ids),
            Definition.source_id == cedict_id,
            Definition.language == "en",
        )
        .order_by(Definition.character_id, Definition.id)
    ).all()
    cedict_by_char: dict[int, str] = {}
    for d in en_defs:
        cedict_by_char.setdefault(d.character_id, d.meaning_text)

    # 5. First CVDICT (vi) definition per character
    vi_defs = session.exec(
        select(Definition)
        .where(
            Definition.character_id.in_(char_ids),
            Definition.source_id == cvdict_id,
            Definition.language == "vi",
        )
        .order_by(Definition.character_id, Definition.id)
    ).all()
    cvdict_by_char: dict[int, str] = {}
    for d in vi_defs:
        cvdict_by_char.setdefault(d.character_id, d.meaning_text)

    # 6. User flashcard statuses
    flashcard_rows = session.exec(
        select(UserFlashcard)
        .where(UserFlashcard.user_id == user_id)
        .where(UserFlashcard.char.in_(chars))
    ).all()
    status_by_char = {fc.char: fc.status for fc in flashcard_rows}

    # 7. Build response, preserving original char order
    from app.services.flashcard_service import _build_sino_vn_map

    char_order = {c: i for i, c in enumerate(chars)}
    
    char_pinyin_pairs = []
    for ch in chars:
        c = char_by_simplified.get(ch)
        if c:
            pys = pinyins_by_char.get(c.id, [])
            first_py = pys[0] if pys else ""
            char_pinyin_pairs.append((ch, first_py))
            
    sino_vn_map = _build_sino_vn_map(session, char_pinyin_pairs)

    results = [
        FlashcardCardResponse(
            char=ch,
            pinyins=[numeric_to_diacritic(p) for p in pinyins_by_char.get(c.id, [])],
            sino_vn=sino_vn_map.get(ch),
            cedict_brief=clean_meaning(cedict_by_char[c.id]).split(";")[0].strip() if c.id in cedict_by_char else None,
            cvdict_brief=cvdict_by_char[c.id].split("/")[0].strip() if c.id in cvdict_by_char else None,
            status=status_by_char.get(ch),
        )
        for ch in chars
        if (c := char_by_simplified.get(ch))
    ]
    results.sort(key=lambda r: char_order.get(r.char, 999))
    return results
