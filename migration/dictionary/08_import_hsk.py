"""
Import HSK vocabulary (drkameleon/complete-hsk-vocabulary) into dictionary.db and backfill
characters.frequency from it.

Tables populated:
  hsk_words  — one row per simplified word (frequency rank, levels like "old-1"/"new-7"/"newest-3")
  hsk_forms  — one row per pronunciation variant

The global HSK notebooks shown in the app are user-side data: they are seeded into app.db
from hsk_words by ../seed_global_notebooks.py.

Source: sources/hsk_complete.json — https://github.com/drkameleon/complete-hsk-vocabulary (MIT)
Idempotent: re-running clears and re-imports both tables, then re-applies frequency.

Usage:
    python migration/dictionary/08_import_hsk.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import SOURCES_DIR, connect_dictionary, require_source  # noqa: E402

JSON_PATH = SOURCES_DIR / "hsk_complete.json"


def _jdump(obj) -> str:
    return json.dumps(obj, ensure_ascii=False)


def run():
    with open(require_source(JSON_PATH), encoding="utf-8") as f:
        data: list[dict] = json.load(f)

    conn = connect_dictionary()
    conn.execute("DELETE FROM hsk_forms")
    conn.execute("DELETE FROM hsk_words")

    forms = 0
    for entry in data:
        word_id = conn.execute(
            """
            INSERT INTO hsk_words (simplified, radical, frequency, pos, levels) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(simplified) DO UPDATE SET
                radical = excluded.radical, frequency = excluded.frequency,
                pos = excluded.pos, levels = excluded.levels
            RETURNING id
            """,
            (entry["simplified"], entry.get("radical"), entry.get("frequency"),
             _jdump(entry.get("pos", [])), _jdump(entry.get("level", []))),
        ).fetchone()[0]

        for form in entry.get("forms", []):
            t = form.get("transcriptions", {})
            conn.execute(
                """
                INSERT INTO hsk_forms (word_id, traditional, pinyin, pinyin_numeric, meanings, classifiers)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (word_id, form.get("traditional"), t.get("pinyin"), t.get("numeric"),
                 _jdump(form.get("meanings", [])), _jdump(form.get("classifiers", []))),
            )
            forms += 1

    # Frequency rank (lower = more common) is used to order search results.
    updated = conn.execute("""
        UPDATE characters
        SET frequency = (SELECT h.frequency FROM hsk_words h WHERE h.simplified = characters.simplified)
        WHERE EXISTS (
            SELECT 1 FROM hsk_words h WHERE h.simplified = characters.simplified AND h.frequency IS NOT NULL
        )
    """).rowcount

    conn.commit()
    conn.close()
    print(f"HSK: {len(data):,} words, {forms:,} forms imported; frequency set on {updated:,} characters.")


if __name__ == "__main__":
    run()
