# migration/

Dữ liệu gốc và các script đổ dữ liệu vào database. Thư mục này **hoàn toàn độc lập với source code**:
không import gì từ `backend/` hay `frontend/`; nó chỉ biết các file DB mà nó tạo ra.

## Hai database

| File | Nội dung | Ai ghi | Git |
|---|---|---|---|
| `backend/data/dictionary.db` | Dữ liệu từ điển gốc: characters, pinyin, definitions, Hán Việt, đồng/trái nghĩa, bộ thủ, HSK | **Chỉ** các script trong `migration/dictionary/` | commit |
| `backend/data/app.db` | Dữ liệu user: users, notes, notebooks (kể cả sổ global), flashcards, history, WOTD, cache | Backend (khi chạy) + `seed_global_notebooks.py` | **không** commit |

Backend mở `app.db` làm DB chính và `ATTACH` `dictionary.db` ở chế độ **read-only** (`mode=ro`) dưới schema
`dictionary`. Vì vậy query join chéo vẫn chạy, nhưng mọi lệnh ghi vào từ điển đều bị SQLite từ chối.

Dữ liệu user tham chiếu tới từ điển bằng **chuỗi chữ giản thể** (`notebook_entries.char`, `user_notes.char`, ...),
không bao giờ bằng `characters.id`, nên build lại từ điển không làm hỏng dữ liệu user.

## Cấu trúc

```
migration/
├── sources/                 # File dữ liệu gốc
├── schema/dictionary.sql    # Schema của dictionary.db (nguồn sự thật duy nhất)
├── dictionary/              # Pipeline build dictionary.db, chạy theo thứ tự 01 → 11
├── seed_global_notebooks.py # Tạo sổ tay HSK global trong app.db từ dictionary.db
├── split_database.py        # Migration 1 lần: tách hanzi.db cũ → dictionary.db + app.db
├── crawlers/hvdic/          # Crawl hvdic.thivien.net → crawled/hvdic.db (xem README trong đó)
├── common.py                # Đường dẫn, kết nối, chuyển pinyin
└── archive/                 # Script migration 1 lần đã chạy xong, giữ để tham khảo, không chạy lại
```

## Nguồn gốc dữ liệu

| File / dữ liệu | Nguồn |
|---|---|
| `sources/cedict_ts.u8` | [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) (MDBG) |
| `sources/CVDICT.u8` | [CVDICT](https://github.com/ph0ngp/CVDICT) |
| `sources/现汉7.mdx` | 现代汉语词典 第7版 (bản MDict `历史版本/20220522` trong thư mục `~/Projects/现代汉语词典7`, không phải git repo; bản text tham khảo: [CNMan/XDHYCD7th](https://github.com/CNMan/XDHYCD7th)) |
| `sources/dict_synonym.txt`, `dict_antonym.txt` | [guotong1988/chinese_dictionary](https://github.com/guotong1988/chinese_dictionary) |
| `sources/hsk_complete.json` | [drkameleon/complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT) |
| `sources/unihan_radical_strokes.tsv`, `hanzi_components_ids.tsv` | Trích từ 2 file `.tab.zip` (Unihan, 汉字部件典) của [lxs602/Chinese-Mandarin-Dictionaries](https://github.com/lxs602/Chinese-Mandarin-Dictionaries) bằng `archive/extract_cmd_dicts.py` |
| Sổ global "Thành ngữ" | Sinh từ CC-CEDICT: mọi từ có "idiom" trong nghĩa (`seed_global_notebooks.py`) |
| Động từ ly hợp (cờ `is_separable` + sổ global) | Sinh từ 现汉7: pinyin có `//` ở giữa, vd. `bāng//máng` (bước 10) |
| `sources/hanviet.csv` | [ph0ngp/hanviet-pinyin-wordlist](https://github.com/ph0ngp/hanviet-pinyin-wordlist) (MIT) — chữ phồn thể; pinyin `*` = chữ chỉ có một âm Hán Việt |
| `sources/radical.csv` | **Chưa rõ** — bảng 214 bộ thủ tiếng Việt, thiếu tài liệu gốc |
| `sources/hanzi_decomposition.csv` | Tạo bởi `archive/hanzi_decompose.py` (thư viện hanzipy: phân rã 1 cấp + bộ thủ, cho các chữ đơn của CC-CEDICT) |

## Build lại dictionary.db từ đầu

```bash
pip install -r migration/requirements.txt
mv backend/data/dictionary.db backend/data/dictionary.db.bak   # nếu muốn build sạch

for f in migration/dictionary/*.py; do python "$f" || break; done
```

Mỗi script đều idempotent (xóa dữ liệu của chính nó rồi import lại), nên có thể chạy lại riêng từng bước.
Toàn bộ pipeline chạy trong vài giây. Muốn ghi ra chỗ khác thì đặt biến `DICTIONARY_DB=/path/to/file.db`.

| Bước | Nguồn | Ghi vào |
|---|---|---|
| 01 CC-CEDICT | `sources/cedict_ts.u8` | characters, pinyin_readings, definitions (en) |
| 02 CVDICT | `sources/CVDICT.u8` | characters, pinyin_readings, definitions (vi) |
| 03 现代汉语词典 | `sources/现汉7.mdx` (cần `mdict-utils`) | characters, pinyin_readings, definitions (zh) |
| 04 Hán Việt | `sources/hanviet.csv` | sino_vietnamese |
| 05 Đồng/trái nghĩa | `sources/dict_synonym.txt`, `dict_antonym.txt` | synonym_groups, synonym_members, antonyms |
| 06 Bộ thủ | `sources/radical.csv` | radical_groups |
| 07 Phân rã chữ | `sources/hanzi_decomposition.csv` | hanzi_decomposition |
| 08 HSK | `sources/hsk_complete.json` | hsk_words, hsk_forms, characters.frequency |
| 09 Unihan + phân rã | `sources/unihan_radical_strokes.tsv`, `hanzi_components_ids.tsv`, hanzi_decomposition | characters.radical / stroke_count / components (IDS trước, thiếu thì lấy từ phân rã) |
| 10 Ly hợp | 现汉7 (definitions của bước 03) | characters.is_separable |
| 11 Tối ưu | — | ANALYZE, VACUUM, integrity_check |

Mọi nguồn đều nằm trong `sources/`, không cần clone repo ngoài. Muốn cập nhật dữ liệu Unihan / 汉字部件典 thì clone
[Chinese-Mandarin-Dictionaries](https://github.com/lxs602/Chinese-Mandarin-Dictionaries) (~11GB) rồi chạy
`CMD_DICTS_DIR=/path/to/checkout python migration/archive/extract_cmd_dicts.py`.

Sau khi build lại, khởi động lại backend.

### Lịch sử

`dictionary.db` hiện tại được build hoàn toàn bằng pipeline này (2026-10-04), thay cho bản tách từ `hanzi.db`
cũ (file đó từng bị hỏng cấu trúc). So với bản cũ: không mất dữ liệu nào; thêm 130 definitions và 311 pinyin
bị mất trước đây, thêm radical/stroke cho 126 chữ, components cho ~3.000 chữ (fallback từ
`hanzi_decomposition`), thêm 216 âm Hán Việt (luôn xếp sau âm cũ, nên âm hiển thị đầu tiên không đổi).

## Lần đầu cài đặt (máy mới)

```bash
# 1. dictionary.db đã có sẵn trong repo (hoặc build lại như trên)
# 2. Tạo app.db rỗng + tài khoản admin
cd backend && python scripts/create_admin.py
# 3. Tạo các sổ tay HSK global
cd .. && python migration/seed_global_notebooks.py
```

## Đổi schema

- **dictionary.db**: sửa `schema/dictionary.sql` và script import liên quan, build lại, rồi cập nhật model tương ứng
  trong `backend/app/models/` (character, radical, sino_vn, synonym_antonym). Backend không bao giờ tạo hay sửa
  các bảng này.
- **app.db**: do backend sở hữu (`SQLModel.metadata.create_all` chỉ tạo các bảng app). Với DB đã có dữ liệu, viết
  một script migration ở đây (chạy 1 lần), rồi chuyển vào `archive/` sau khi đã áp dụng.
