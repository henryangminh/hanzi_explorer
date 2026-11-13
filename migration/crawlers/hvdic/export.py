"""
Export the crawled data as JSON Lines (one word per line: {"word", "whv", "wpy"}), e.g. to
load it into the main database later. With --reparse, parsed data is first rebuilt from the
stored HTML (after improving parse.py) — no re-crawling needed.

Usage:
    python migration/crawlers/hvdic/export.py [--reparse] [--out path.jsonl]
"""
import argparse
import json

import store
from parse import glyph_image_urls, parse


def reparse(conn) -> int:
    rows = conn.execute("SELECT word, kind, html_gz FROM pages WHERE found = 1").fetchall()
    for word, kind, blob in rows:
        data = parse(store.read_html(blob))
        conn.execute("UPDATE pages SET data = ? WHERE word = ? AND kind = ?",
                     (json.dumps(data, ensure_ascii=False), word, kind))
        store.add_image_refs(conn, word, glyph_image_urls(data))  # newly found images: next crawl downloads them
    conn.commit()
    return len(rows)


def export(conn, out_path) -> int:
    words: dict[str, dict] = {}
    for word, kind, data in conn.execute("SELECT word, kind, data FROM pages ORDER BY word"):
        words.setdefault(word, {"word": word})[kind] = json.loads(data) if data else None
    with open(out_path, "w", encoding="utf-8") as f:
        for item in words.values():
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
    return len(words)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reparse", action="store_true")
    parser.add_argument("--out", default=str(store.HVDIC_DB.with_suffix(".jsonl")))
    args = parser.parse_args()
    conn = store.connect()
    if args.reparse:
        print(f"Re-parsed {reparse(conn):,} pages.")
    print(f"Exported {export(conn, args.out):,} words to {args.out}")


if __name__ == "__main__":
    main()
