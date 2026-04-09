"""
Import CVDICT into SQLite using the new normalized schema.
Creates/updates rows in: characters, pinyin_readings, definitions (language='vi').

CVDICT format (same as CC-CEDICT):
    Traditional Simplified [pinyin] /nghĩa tiếng Việt 1/nghĩa 2/.../

Usage:
    1. Tải CVDICT.u8 từ https://github.com/ph0ngp/CVDICT
    2. Đặt vào backend/data/CVDICT.u8
    3. Chạy: python scripts/import_cvdict.py

Script là idempotent — nếu chạy lại sẽ xóa definitions cũ và import lại.
"""
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select, delete, SQLModel
from app.core.database import engine
from app.core.pinyin import numeric_to_diacritic
from app.models.character import Character, PinyinReading, Definition, DictionarySource

DATA_FILE = Path(__file__).parent.parent / "data" / "CVDICT.u8"
SOURCE_NAME = "CVDICT"
BATCH_SIZE = 1000


def parse_cvdict_line(line: str) -> dict | None:
    line = line.strip()
    if not line or line.startswith("#"):
        return None
    try:
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

        return {
            "traditional": traditional if traditional != simplified else None,
            "simplified": simplified,
            "pinyin_numeric": pinyin,
            "meaning_vi": meanings_raw,
        }
    except (ValueError, IndexError):
        return None


def main():
    if not DATA_FILE.exists():
        print(f"[ERROR] Không tìm thấy file: {DATA_FILE}")
        print("Tải CVDICT.u8 từ https://github.com/ph0ngp/CVDICT")
        sys.exit(1)

    print(f"[INFO] Đọc file: {DATA_FILE}")
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # Upsert DictionarySource
        source = session.exec(
            select(DictionarySource).where(DictionarySource.name == SOURCE_NAME)
        ).first()
        if source:
            print(f"[INFO] Source '{SOURCE_NAME}' đã tồn tại (id={source.id}). Xóa definitions cũ...")
            session.exec(delete(Definition).where(Definition.source_id == source.id))
            session.commit()
        else:
            source = DictionarySource(name=SOURCE_NAME)
            session.add(source)
            session.commit()
            session.refresh(source)
            print(f"[INFO] Tạo source '{SOURCE_NAME}' (id={source.id})")

        total = 0
        skipped = 0
        batch_count = 0

        with open(DATA_FILE, encoding="utf-8") as f:
            for line in f:
                parsed = parse_cvdict_line(line)
                if not parsed:
                    skipped += 1
                    continue

                simplified = parsed["simplified"]
                traditional = parsed["traditional"]
                pinyin_num = parsed["pinyin_numeric"]
                meaning_vi = parsed["meaning_vi"]

                # Upsert character
                char_row = session.exec(
                    select(Character).where(Character.simplified == simplified)
                ).first()
                if not char_row:
                    char_row = Character(simplified=simplified, traditional=traditional)
                    session.add(char_row)
                    session.flush()
                elif traditional and not char_row.traditional:
                    char_row.traditional = traditional
                    session.add(char_row)
                    session.flush()

                # Insert pinyin reading if not already present
                existing_pinyin = session.exec(
                    select(PinyinReading)
                    .where(PinyinReading.character_id == char_row.id)
                    .where(PinyinReading.pinyin_numeric == pinyin_num)
                ).first()
                if not existing_pinyin:
                    session.add(PinyinReading(
                        character_id=char_row.id,
                        pinyin=numeric_to_diacritic(pinyin_num),
                        pinyin_numeric=pinyin_num,
                    ))
                    session.flush()

                # Insert vi definition
                session.add(Definition(
                    character_id=char_row.id,
                    source_id=source.id,
                    language='vi',
                    meaning_text=meaning_vi,
                ))
                total += 1
                batch_count += 1

                if batch_count >= BATCH_SIZE:
                    session.commit()
                    batch_count = 0
                    print(f"  → {total:,} entries đã import...", end="\r")

        session.commit()

        source.entry_count = total
        source.imported_at = datetime.now(timezone.utc).isoformat()
        session.add(source)
        session.commit()

    print(f"\n[DONE] Import xong!")
    print(f"  ✓ {total:,} entries đã import")
    print(f"  ✗ {skipped:,} dòng bỏ qua (comment/rỗng)")


if __name__ == "__main__":
    main()
