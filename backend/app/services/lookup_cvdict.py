"""
PATCH: Thêm vào file backend/app/services/dictionary_service.py

Thêm 2 thứ:
1. Import CvdictCharacter ở đầu file
2. Hàm lookup_cvdict() — tương tự lookup_cedict() nhưng dùng CvdictCharacter
"""

# ── THÊM VÀO PHẦN IMPORT của dictionary_service.py ───────────────────────────
#
# from app.models.cvdict_character import CvdictCharacter
# from app.schemas.dictionary import CvdictEntry  # (xem file schemas bên dưới)
#

# ── THÊM HÀM NÀY VÀO dictionary_service.py ───────────────────────────────────

from sqlmodel import Session, select
from app.core.pinyin import numeric_to_diacritic
from app.models.cvdict_character import CvdictCharacter
from app.models.character import DictionarySource


def lookup_cvdict(session: Session, char: str) -> list:
    """
    Trả về tất cả entries CVDICT cho một chữ/từ.
    Nhiều entries = nhiều cách đọc / nghĩa khác nhau.
    """
    rows = session.exec(
        select(CvdictCharacter)
        .where(CvdictCharacter.simplified == char)
        .order_by(CvdictCharacter.id)
    ).all()

    results = []
    for row in rows:
        source = session.get(DictionarySource, row.source_id)
        results.append({
            "id": row.id,
            "simplified": row.simplified,
            "traditional": row.traditional,
            "pinyin": numeric_to_diacritic(row.pinyin),
            "meaning_vi": row.meaning_vi,
            "radical": row.radical,
            "stroke_count": row.stroke_count,
            "hsk_level": row.hsk_level,
            "source_name": source.name if source else "CVDICT",
        })

    return results
