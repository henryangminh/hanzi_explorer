"""
Seed the global notebooks into app.db from dictionary.db:
  * one notebook per HSK scheme/level (from hsk_words, step 08);
  * "Thành ngữ": every CC-CEDICT word whose definition mentions "idiom"
    (e.g. "(idiom)", "(idiom, from Analects)"), in CC-CEDICT order;
  * "Động từ ly hợp": every word marked separable (step 10, from 现代汉语词典), in 现代汉语词典 order.

Global notebooks are user-side data (admins can rename/edit them in the app), so they live in
app.db; this script only creates what is missing and never deletes or renames anything:
  * a notebook is created if no global notebook with that name exists;
  * words are added with INSERT OR IGNORE, so entries removed by hand are re-added only if you
    run this again.

Run after app.db exists (backend/scripts/create_admin.py creates it) and after the dictionary pipeline.

Names match the notebooks of the original database; admins can rename them in the app.

Usage:
    python migration/seed_global_notebooks.py
"""
import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone

from common import APP_DB, DICTIONARY_DB, require_source

HSK_SCHEMES = ("old", "new", "newest")


@dataclass
class NotebookSpec:
    name: str
    description: str
    words: list[str]


# ── HSK lists ────────────────────────────────────────────────────────────────

def _hsk_level_label(scheme: str, level: int) -> str:
    # Level 7 of HSK 3.0 covers the combined 7-9 band
    return "7-9" if (scheme in ("new", "newest") and level == 7) else str(level)


def _hsk_name(scheme: str, level: int) -> str:
    suffix = {"old": "2.0", "new": "3.0", "newest": "3.0 newest"}[scheme]
    return f"HSK{_hsk_level_label(scheme, level)} {suffix}"


def _hsk_description(scheme: str, level: int) -> str:
    scheme_label = {"old": "HSK 2.0", "new": "HSK 3.0", "newest": "HSK 3.0 newest"}[scheme]
    return f"{scheme_label} — Level {_hsk_level_label(scheme, level)}"


def hsk_notebooks(dictionary: sqlite3.Connection) -> list[NotebookSpec]:
    """One notebook per scheme/level, ordered old → new → newest, level ascending."""
    words_by_level: dict[tuple[str, int], list[str]] = {}
    for simplified, levels_json in dictionary.execute("SELECT simplified, levels FROM hsk_words ORDER BY id"):
        for tag in json.loads(levels_json):  # e.g. "new-7"
            scheme, _, num = tag.rpartition("-")
            if scheme in HSK_SCHEMES and num.isdigit():
                words_by_level.setdefault((scheme, int(num)), []).append(simplified)

    return [
        NotebookSpec(_hsk_name(scheme, level), _hsk_description(scheme, level), words_by_level[(scheme, level)])
        for scheme in HSK_SCHEMES
        for level in sorted(lv for s, lv in words_by_level if s == scheme)
    ]


# ── Idioms ───────────────────────────────────────────────────────────────────

def idiom_notebook(dictionary: sqlite3.Connection) -> NotebookSpec:
    words = [r[0] for r in dictionary.execute("""
        SELECT ch.simplified FROM definitions d
        JOIN characters ch ON ch.id = d.character_id
        JOIN dictionary_sources s ON s.id = d.source_id
        WHERE s.name = 'CC-CEDICT' AND d.meaning_text LIKE '%idiom%'
        GROUP BY ch.simplified
        ORDER BY MIN(d.id)
    """)]
    return NotebookSpec("Thành ngữ", "Thành ngữ", words)


# ── Separable verbs ──────────────────────────────────────────────────────────

def separable_verb_notebook(dictionary: sqlite3.Connection) -> NotebookSpec:
    words = [r[0] for r in dictionary.execute("""
        SELECT ch.simplified FROM characters ch
        JOIN definitions d ON d.character_id = ch.id
        JOIN dictionary_sources s ON s.id = d.source_id
        WHERE ch.is_separable = 1 AND s.name = '现代汉语词典'
        GROUP BY ch.simplified
        ORDER BY MIN(d.id)
    """)]
    return NotebookSpec("Động từ ly hợp", "Động từ ly hợp (离合词) theo 现代汉语词典", words)


# ── Writing to app.db ────────────────────────────────────────────────────────

def seed(app: sqlite3.Connection, specs: list[NotebookSpec]) -> tuple[int, int]:
    """Create missing notebooks and entries; returns (notebooks created, entries added)."""
    admin = app.execute("SELECT id FROM users WHERE is_admin = 1 ORDER BY id LIMIT 1").fetchone()
    now = datetime.now(timezone.utc).isoformat()
    created = added = 0
    for spec in specs:
        row = app.execute("SELECT id FROM notebooks WHERE name = ? AND type = 'global'", (spec.name,)).fetchone()
        if row:
            nb_id = row[0]
        else:
            nb_id = app.execute(
                """INSERT INTO notebooks (name, description, type, owner_id, sort_order, created_at, updated_at)
                   VALUES (?, ?, 'global', ?, 0, ?, ?)""",
                (spec.name, spec.description, admin[0] if admin else None, now, now),
            ).lastrowid
            created += 1
        added += app.executemany(
            "INSERT OR IGNORE INTO notebook_entries (notebook_id, char, added_at) VALUES (?, ?, ?)",
            [(nb_id, w, now) for w in spec.words],
        ).rowcount
    return created, added


def main() -> None:
    require_source(DICTIONARY_DB)
    require_source(APP_DB)

    dictionary = sqlite3.connect(f"file:{DICTIONARY_DB}?mode=ro", uri=True)
    specs = [*hsk_notebooks(dictionary), idiom_notebook(dictionary), separable_verb_notebook(dictionary)]
    dictionary.close()

    app = sqlite3.connect(APP_DB)
    created, added = seed(app, specs)
    app.commit()
    app.close()
    print(f"Global notebooks: {created} created, {added:,} entries added.")


if __name__ == "__main__":
    main()
