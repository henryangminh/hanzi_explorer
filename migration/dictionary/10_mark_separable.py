"""
Mark separable verbs (离合词) in characters.is_separable, following 现代汉语词典.

现汉7 writes separable verbs with "//" between the parts of the pinyin: 帮忙 bāng//máng,
出摊儿 chū//tānr. A leading "//" means something else — a directional complement written
after a verb (上 //·shàng, 下来 //·xià//·lái) — so those are not marked.

Run after 03_import_xdhy.py. Idempotent: resets every row, then marks the matches.

Usage:
    python migration/dictionary/10_mark_separable.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import connect_dictionary  # noqa: E402

XDHY_SOURCE = "现代汉语词典"


def is_separable_pinyin(pinyin: str) -> bool:
    return "//" in pinyin and not pinyin.lstrip().startswith("//")


def main():
    conn = connect_dictionary()
    rows = conn.execute("""
        SELECT d.character_id, d.meaning_text FROM definitions d
        JOIN dictionary_sources s ON s.id = d.source_id
        WHERE s.name = ?
    """, (XDHY_SOURCE,)).fetchall()
    if not rows:
        raise SystemExit("[ERROR] No 现代汉语词典 definitions — run 03_import_xdhy.py first.")

    separable_ids = {cid for cid, text in rows if is_separable_pinyin(json.loads(text).get("pinyin", ""))}
    conn.execute("UPDATE characters SET is_separable = 0")
    conn.executemany("UPDATE characters SET is_separable = 1 WHERE id = ?", [(cid,) for cid in separable_ids])
    conn.commit()
    conn.close()
    print(f"Separable verbs: {len(separable_ids):,} marked from 现代汉语词典.")


if __name__ == "__main__":
    main()
