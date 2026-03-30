"""
Script import CVDICT vào SQLite.

CVDICT format (giống CC-CEDICT):
    Traditional Simplified [pinyin] /nghĩa tiếng Việt 1/nghĩa 2/.../
    Comment lines bắt đầu bằng #

Usage:
    1. Tải CVDICT.u8 từ https://github.com/ph0ngp/CVDICT
    2. Đặt vào backend/data/CVDICT.u8
    3. Chạy: python scripts/import_cvdict.py

Script là idempotent — nếu chạy lại sẽ xóa data cũ và import lại.
"""
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

# Thêm backend root vào sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select, SQLModel
from app.core.database import engine
from app.models.character import DictionarySource, CcCedictCharacter  # noqa — trigger table creation
from app.models.cvdict_character import CvdictCharacter

DATA_FILE = Path(__file__).parent.parent / "data" / "CVDICT.u8"
SOURCE_NAME = "CVDICT"
BATCH_SIZE = 1000


def parse_cvdict_line(line: str) -> dict | None:
    """
    Parse 1 dòng CVDICT (format giống CC-CEDICT).
    Trả về dict hoặc None nếu là comment / dòng rỗng.
    """
    line = line.strip()
    if not line or line.startswith("#"):
        return None

    try:
        # Format: Traditional Simplified [pinyin] /meaning1/meaning2/.../
        bracket_start = line.index("[")
        bracket_end = line.index("]")
        slash_start = line.index("/")

        chars_part = line[:bracket_start].strip().split()
        if len(chars_part) < 2:
            return None

        traditional = chars_part[0]
        simplified = chars_part[1]
        pinyin = line[bracket_start + 1:bracket_end].strip()

        meanings_raw = line[slash_start + 1:].rstrip("/")
        meaning_vi = meanings_raw  # Giữ nguyên dạng "nghĩa1/nghĩa2/..."

        return {
            "traditional": traditional,
            "simplified": simplified,
            "pinyin": pinyin,
            "meaning_vi": meaning_vi,
        }
    except (ValueError, IndexError):
        return None


def main():
    if not DATA_FILE.exists():
        print(f"[ERROR] Không tìm thấy file: {DATA_FILE}")
        print("Tải CVDICT.u8 từ https://github.com/ph0ngp/CVDICT")
        sys.exit(1)

    print(f"[INFO] Đọc file: {DATA_FILE}")

    # Tạo tables nếu chưa có
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # Upsert DictionarySource
        source = session.exec(
            select(DictionarySource).where(DictionarySource.name == SOURCE_NAME)
        ).first()

        if source:
            print(f"[INFO] Source '{SOURCE_NAME}' đã tồn tại (id={source.id}). Xóa data cũ...")
            # Xóa hết entries cũ
            old_entries = session.exec(
                select(CvdictCharacter).where(CvdictCharacter.source_id == source.id)
            ).all()
            for entry in old_entries:
                session.delete(entry)
            session.commit()
            print(f"[INFO] Đã xóa {len(old_entries)} entries cũ.")
        else:
            source = DictionarySource(name=SOURCE_NAME)
            session.add(source)
            session.commit()
            session.refresh(source)
            print(f"[INFO] Tạo source '{SOURCE_NAME}' (id={source.id})")

        # Parse và insert
        batch = []
        total = 0
        skipped = 0

        with open(DATA_FILE, encoding="utf-8") as f:
            for line in f:
                parsed = parse_cvdict_line(line)
                if not parsed:
                    skipped += 1
                    continue

                batch.append(CvdictCharacter(
                    source_id=source.id,
                    simplified=parsed["simplified"],
                    traditional=parsed["traditional"] if parsed["traditional"] != parsed["simplified"] else None,
                    pinyin=parsed["pinyin"],
                    meaning_vi=parsed["meaning_vi"],
                ))
                total += 1

                if len(batch) >= BATCH_SIZE:
                    session.add_all(batch)
                    session.commit()
                    batch = []
                    print(f"  → {total:,} entries đã import...", end="\r")

        # Flush batch cuối
        if batch:
            session.add_all(batch)
            session.commit()

        # Cập nhật entry_count
        source.entry_count = total
        source.imported_at = datetime.now(timezone.utc).isoformat()
        session.add(source)
        session.commit()

    print(f"\n[DONE] Import xong!")
    print(f"  ✓ {total:,} entries đã import")
    print(f"  ✗ {skipped:,} dòng bỏ qua (comment/rỗng)")


if __name__ == "__main__":
    main()
