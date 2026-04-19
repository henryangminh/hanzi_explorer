# Backend Architecture & Development Rules

Tài liệu này mô tả kiến trúc backend và các quy tắc bắt buộc phải tuân theo.
Dành cho cả người đọc lẫn AI agent làm việc trên codebase này.

---

## 1. Kiến trúc tổng quan

```
backend/app/
├── api/v1/          ← HTTP layer: nhận request, kiểm tra quyền, trả response
├── services/        ← Business logic layer: mọi truy vấn DB đều nằm ở đây
├── models/          ← SQLModel table definitions (ánh xạ trực tiếp với DB)
├── schemas/         ← Pydantic schemas cho request/response (không phải table)
├── core/            ← Tiện ích dùng chung: config, deps, security, pinyin, cedict_utils
└── rules/           ← Tài liệu kiến trúc và quy tắc (file này)
```

### Luồng xử lý request

```
HTTP Request
    → api/v1/*.py          (parse params, auth check, gọi service)
    → services/*_service.py (truy vấn DB bằng ORM, xử lý business logic)
    → models/*.py           (SQLModel table objects)
    → HTTP Response
```

---

## 2. Các layer và trách nhiệm

### api/v1/ — HTTP Layer

- Chỉ được phép làm: parse params, kiểm tra quyền truy cập (403/404), gọi service, trả response.
- **KHÔNG** được truy vấn DB trực tiếp (`session.execute`, `session.exec(select(...))`, `text(...)`, v.v.).
- **KHÔNG** chứa business logic hoặc SQL.
- Router prefix phải nhất quán với frontend đang gọi (tránh đổi URL gây break).

### services/ — Business Logic Layer

- Toàn bộ truy vấn DB phải nằm ở đây.
- Sử dụng SQLModel ORM (`session.exec(select(...))`) — **không dùng raw SQL**.
- Một file service tương ứng với một domain: `notebook_service.py`, `flashcard_service.py`, `wotd_service.py`, v.v.
- Function trả về typed Python objects (schema hoặc model), không trả raw rows.

### models/ — DB Table Definitions

- Chỉ chứa `SQLModel` class định nghĩa bảng. Không có logic.
- Mỗi file nhóm các bảng liên quan: `character.py` chứa Character, PinyinReading, Definition, DictionarySource, ExternalCache.

### schemas/ — Request/Response Schemas

- Pydantic `BaseModel` dùng cho API input/output. Tách biệt hoàn toàn với models.
- Không import từ `models/` (tránh circular dependency và coupling).

### core/ — Shared Utilities

- `deps.py`: FastAPI dependencies (`CurrentUser`, `DbSession`).
- `pinyin.py`: chuyển đổi pinyin numeric ↔ diacritic.
- `cedict_utils.py`: clean/parse CEDICT meaning strings.
- `security.py`: JWT, password hashing.

---

## 3. Quy tắc bắt buộc

### 3.1 Không dùng raw SQL trong bất kỳ layer nào

**Sai:**
```python
# Trong API hoặc service
rows = session.execute(text("SELECT * FROM characters WHERE simplified = :c"), {"c": char})
```

**Đúng:**
```python
# Trong service
char_row = session.exec(select(Character).where(Character.simplified == char)).first()
```

Raw SQL chỉ được phép nếu ORM thực sự không hỗ trợ (ví dụ: `json_each` table-valued function của SQLite). Ngay cả khi đó, phải có comment giải thích lý do.

### 3.2 Không đặt import bên trong function

**Sai:**
```python
def get_flashcards(...):
    from sqlalchemy import text          # ← sai
    from app.models.note import UserFlashcard  # ← sai
    ...
```

**Đúng:**
```python
from sqlalchemy import text
from app.models.note import UserFlashcard

def get_flashcards(...):
    ...
```

Import phải luôn ở đầu file. Inline import chỉ được phép nếu tránh circular import thực sự không giải quyết được theo cách khác.

### 3.3 API không được gọi DB trực tiếp

**Sai** (trong `api/v1/notebooks.py`):
```python
@router.get("/flashcards")
def get_flashcards(session: DbSession, user: CurrentUser):
    rows = session.execute(text("SELECT ...")).fetchall()  # ← sai
```

**Đúng** (trong `api/v1/flashcards.py`):
```python
@router.get("")
def get_flashcards(session: DbSession, user: CurrentUser):
    return flashcard_service.get_flashcards(session, ...)  # ← đúng
```

### 3.4 Tách service theo domain

Mỗi domain chức năng phải có file service riêng:

| Domain | API file | Service file |
|---|---|---|
| Notebooks (sổ tay) | `api/v1/notebooks.py` | `services/notebook_service.py` |
| Flashcards | `api/v1/flashcards.py` | `services/flashcard_service.py` |
| Word of the Day | `api/v1/wotd.py` | `services/wotd_service.py` |
| Dictionary | `api/v1/dictionary.py` | `services/dictionary_service.py` |
| Radicals | `api/v1/radicals.py` | `services/radical_service.py` |
| Synonyms/Antonyms | (gọi từ dictionary) | `services/synonym_antonym_service.py` |
| Hanzi decomposition | (gọi từ radicals) | `services/hanzi_service.py` |

**KHÔNG** được gộp hai domain khác nhau vào cùng một file API hoặc service.

### 3.5 Batch queries — không N+1

Khi cần dữ liệu liên quan cho nhiều bản ghi, fetch batch một lần rồi group trong Python. Không dùng vòng lặp gọi DB cho từng item.

**Sai (N+1):**
```python
for entry in entries:
    pinyin = session.exec(select(PinyinReading).where(...char_id == entry.char_id...)).first()
```

**Đúng (batch):**
```python
all_pinyins = session.exec(
    select(PinyinReading).where(PinyinReading.character_id.in_(char_ids))
).all()
pinyins_by_char = {}
for pr in all_pinyins:
    pinyins_by_char.setdefault(pr.character_id, []).append(pr)
```

Ngoại lệ chấp nhận được: N+1 khi N nhỏ và cố định (ví dụ: độ dài từ tiếng Trung là 1–4 ký tự trong `synonym_antonym_service._get_word_info`).

### 3.6 ORM trả về typed objects — không trả raw rows

**Sai:**
```python
return session.execute(text("SELECT simplified, pinyin FROM ...")).fetchall()
# Người gọi phải biết row[0] là gì
```

**Đúng:**
```python
return session.exec(select(Character).where(...)).all()
# Người gọi dùng char.simplified, char.pinyin rõ ràng
```

### 3.7 Không để file "obsolete" trong codebase

Nếu một file không còn dùng nữa, xóa ngay. Không để lại comment như `# Obsolete, use X instead` mà vẫn giữ file. Ví dụ: `lookup_cvdict.py` đã bị xóa vì logic đã chuyển vào `dictionary_service.py`.

---

## 4. Cấu trúc DB quan trọng

### Bảng characters — nguồn sự thật duy nhất cho ký tự

- `simplified`: form giản thể (primary key logic)
- `traditional`: form phồn thể (nullable)
- `radical`, `stroke_count`, `is_separable`, `components` (JSON array)

### Bảng definitions — tất cả nghĩa từ mọi nguồn

- Một hàng = một nghĩa từ một nguồn cụ thể
- `source_id` → `dictionary_sources` (CC-CEDICT, CVDICT, ...)
- `language`: `'en'` hoặc `'vi'`
- Để lấy nghĩa đầu tiên: `ORDER BY id LIMIT 1` hoặc `MIN(id)` trong GROUP BY

### Bảng pinyin_readings — đọc âm

- Một ký tự có thể có nhiều hàng (đa âm)
- `pinyin`: dạng diacritic (zhōng), `pinyin_numeric`: dạng số (zhong1)
- Primary reading = hàng có `id` nhỏ nhất

### Bảng sino_vietnamese — Hán Việt

- Join với `pinyin_readings` qua `pinyin` (numeric) để lấy đúng âm tương ứng
- `hanviet` có thể chứa nhiều cách đọc phân cách bởi dấu phẩy

### dictionary_sources — registry nguồn từ điển

- Luôn resolve `id` bằng ORM trước khi dùng, không hardcode
- Tên quan trọng: `'CC-CEDICT'` (tiếng Anh), `'CVDICT'` (tiếng Việt)

---

## 5. Conventions

- Function trả `None` khi không tìm thấy record (404 do API layer xử lý, không phải service).
- Service không raise `HTTPException` — đó là việc của API layer.
- Sắp xếp kết quả: luôn có `ORDER BY` rõ ràng, không dựa vào thứ tự insert.
- Streaming response (NDJSON) chỉ dùng cho endpoint preview notebook — fetch toàn bộ rows trước rồi mới stream để release DB connection sớm.
