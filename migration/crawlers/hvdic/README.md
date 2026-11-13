# Crawler hvdic.thivien.net

Crawl trang `/whv/<từ>` (theo âm Hán Việt) và `/wpy/<từ>` (theo pinyin) cho **mọi từ trong `dictionary.db`**,
lưu **vĩnh viễn** vào DB riêng `migration/crawled/hvdic.db` (không TTL, không đụng tới DB của app).
`robots.txt` của trang cho phép `/whv/` và `/wpy/`.

## Chạy

```bash
# chạy nền, tiếp tục từ chỗ dừng lần trước (Ctrl+C / kill để dừng bất cứ lúc nào)
nohup python3 migration/crawlers/hvdic/crawl.py > /dev/null 2>&1 &

python3 migration/crawlers/hvdic/crawl.py --status   # tiến độ + số ngày còn lại
tail -f migration/crawled/hvdic.log                   # log
```

Máy sleep thì crawler tạm dừng và tự chạy tiếp khi thức dậy; khởi động lại máy thì chạy lại lệnh trên.

## Nhịp crawl (để không spam server)

Quy luật quan sát được (10/2026): hvdic chặn IP khi trong **24 giờ gần nhất** đã có khoảng **2.000 request**
(tính cả trang lẫn ảnh), và mở lại dần khi các request cũ trôi ra khỏi khung 24 giờ đó.

- Crawler giữ tối đa **1.900 request / 24 giờ trượt** (thấp hơn giới hạn 5%), chia đều: cứ ~45s một request,
  không nghỉ theo chu kỳ. Khi khởi động, nó tính luôn các request đã gửi trong 24 giờ trước (lấy từ DB).
- 1 chữ đơn ≈ 2 trang + ~2–3 ảnh tự hình (~4,3 request) → ~440 chữ/ngày; 1 từ 2 chữ = 2 request → ~950 từ/ngày.

**Theo dõi và tinh chỉnh.** Giới hạn của trang có thể đổi, nên thỉnh thoảng xem `--status`:

- `requests in the last 24h`: số request 24 giờ qua (luôn ≤ budget).
- `access-denied checks`: số lần bị chặn. Đang chạy nhịp này mà vẫn bị chặn ⇒ giới hạn đã giảm → chạy lại với
  budget thấp hơn, vd. `--budget 1500`. Nhiều tuần liền không bị chặn lần nào thì có thể thử tăng dần (vd. 1950).
- Lỗi mạng / 429 / 5xx: chờ 1, 5, 15 phút rồi thử lại; vẫn lỗi thì dừng hẳn (chạy lại sau).
- Bị chặn ("truy cập của bạn đã bị từ chối", trả về HTTP 200): không lưu gì, nghỉ 3 tiếng rồi thử lại;
  vẫn bị chặn thì cứ 30 phút thử lại 1 lần, hết chặn thì chạy tiếp. Nếu bị chặn ngay từ lúc khởi động
  thì thử lại mỗi 30 phút luôn (không chờ 3 tiếng).

## Phạm vi và thứ tự ưu tiên (~84k từ)

Chỉ crawl trước chữ đơn và từ 2 chữ. Từ 3 chữ trở lên để sau (dự kiến: crawl khi có người tra từ đó).

| Mức | Nội dung |
|---|---|
| 0 | Chữ đơn (~11,9k) |
| 1 | Từ 2 chữ thuộc HSK (2.0, 3.0 hoặc 3.0 newest) |
| 2 | Từ 2 chữ mà chính hvdic liệt kê trong mục "Từ ghép" của các chữ đã crawl (chắc chắn có trang) |
| 3 | Từ 2 chữ còn lại |

Trong mỗi mức, từ thông dụng hơn (tần suất cao) được crawl trước.

## Đánh dấu đã crawl / chưa crawl

Chạy lại bao nhiêu lần cũng được — chỉ làm phần còn thiếu:

- trang `(word, kind)` đã có trong `pages` (kể cả trang "không tìm thấy") thì không request lại;
- từ mới có 1 trong 2 trang (bị dừng giữa chừng) thì chỉ request trang còn thiếu;
- ảnh tự hình có `fetched_at` thì không tải lại; ảnh còn `NULL` được tải ở lần chạy sau.

`--status` cho biết đã xong bao nhiêu từ ở mỗi mức.

## Dữ liệu

Bảng `pages(word, kind, http_status, found, html_gz, data, fetched_at)`:

- `html_gz`: phần nội dung đã làm sạch (gzip) — giữ lại để **parse lại không cần crawl lại**.
- `data`: JSON đã parse (`parse.py`): danh sách kết quả, thông tin chữ (âm Quan thoại / Hán Việt, tổng nét,
  bộ, lục thư, hình thái, nét bút, Thương Hiệt, Unicode, độ thông dụng), dữ liệu animation nét bút
  (`stroke_graphics`, định dạng hanzi-writer), tự hình (`glyph_forms`: Giáp cốt văn, Kim văn, Triện văn,
  Lệ thư, Khải thư → URL ảnh), dị thể (`variants`), âm đọc khác (Nôm, Nhật, Hàn, Quảng Đông…),
  chữ gần giống, bài thơ, và từng cách đọc: nghĩa theo từng từ điển (phổ thông, trích dẫn, Thiều Chửu,
  Trần Văn Chánh, Nguyễn Quốc Hùng, Trung-Anh) + danh sách từ ghép.
- Chỉ bỏ phần trang trí: quảng cáo, script, icon, khung SVG.

Bảng `glyph_images(url, word, label, http_status, content, content_type, fetched_at)`: ảnh tự hình (gif, ~1–2 KB)
tải về lưu luôn trong DB, nên sau này không cần phụ thuộc vào trang gốc.

```bash
python3 migration/crawlers/hvdic/export.py             # → migration/crawled/hvdic.jsonl
python3 migration/crawlers/hvdic/export.py --reparse   # sau khi sửa parse.py
```
