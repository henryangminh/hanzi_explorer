"""
Import Sino-Vietnamese (Hán Việt) readings from sources/hanviet.csv into sino_vietnamese.

Source: https://github.com/ph0ngp/hanviet-pinyin-wordlist (MIT), traditional characters only.
CSV columns: char, hanviet (Python list literal), pinyin (numeric tone, or "*" when the
character has a single Hán Việt reading whatever its pinyin)

Rows with empty hanviet lists are skipped.
Multiple hanviet readings for the same char+pinyin are stored comma-separated.

Run after 01–03: character_id is resolved against the characters table. The CSV is keyed mostly
by traditional characters, so a reading is attached to the row whose simplified form is the char
AND to every row that has the char as its traditional form (鍾 → both 鍾 and 钟).

Insertion order matters — the app shows a character's first reading (lowest id):
  1. in CSV order, each row goes to its *primary* target: the char's own row if it is a CC-CEDICT
     headword, else its traditional match, else its own row (XDHY/CVDICT also use traditional
     forms such as 兒 as headwords; those must not steal readings from 儿). A traditional form
     shared by several words (妳 → 你, 奶) has the newest row as its single primary match;
  2. afterwards, every remaining match gets a copy, so it only ever adds readings after the
     ones a character already had.

Idempotent: re-running clears and re-imports the table.

Usage:
    python migration/dictionary/04_import_sino_vn.py
"""
import ast
import csv
import sqlite3
import sys
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import SOURCES_DIR, connect_dictionary, require_source  # noqa: E402

CSV_PATH = SOURCES_DIR / 'hanviet.csv'

Reading = tuple[int, str, str]  # (character_id, pinyin, hanviet)


@dataclass
class CharacterTargets:
    """Where a CSV char can be attached in the characters table."""
    simp_to_id: dict[str, int]
    trad_to_ids: dict[str, list[int]]
    cedict_ids: set[int]

    def split(self, char: str) -> tuple[list[int], list[int]]:
        """(primary ids, extra ids) for a CSV char — see the module docstring for the rules."""
        own_id = self.simp_to_id.get(char)
        trad_ids = [cid for cid in self.trad_to_ids.get(char, []) if cid != own_id]
        own = [own_id] if own_id is not None else []
        if own_id in self.cedict_ids or not trad_ids:
            return own, trad_ids
        return trad_ids[-1:], trad_ids[:-1] + own


def load_targets(conn: sqlite3.Connection) -> CharacterTargets:
    simp_to_id: dict[str, int] = {}
    trad_to_ids: dict[str, list[int]] = {}
    for cid, simp, trad in conn.execute('SELECT id, simplified, traditional FROM characters ORDER BY id'):
        simp_to_id[simp] = cid
        if trad:
            trad_to_ids.setdefault(trad, []).append(cid)
    cedict_ids = {cid for (cid,) in conn.execute("""
        SELECT DISTINCT d.character_id FROM definitions d
        JOIN dictionary_sources s ON s.id = d.source_id WHERE s.name = 'CC-CEDICT'
    """)}
    return CharacterTargets(simp_to_id, trad_to_ids, cedict_ids)


def parse_hanviet(raw: str) -> str | None:
    """"['càn', 'kiền']" → "càn,kiền"; None for empty or malformed lists."""
    try:
        values = ast.literal_eval(raw.strip())
    except (ValueError, SyntaxError):
        return None
    if not isinstance(values, list):
        return None
    return ','.join(v.strip() for v in values if v.strip()) or None


def collect_readings(targets: CharacterTargets) -> tuple[list[Reading], list[Reading], int, int]:
    """Read the CSV → (primary readings, extra readings, skipped rows, rows with no character)."""
    primary: list[Reading] = []
    extra: list[Reading] = []
    skipped = not_found = 0
    with open(CSV_PATH, encoding='utf-8', newline='') as f:
        for row in csv.DictReader(f):
            hanviet = parse_hanviet(row['hanviet'])
            if hanviet is None:
                skipped += 1
                continue
            primary_ids, extra_ids = targets.split(row['char'].strip())
            if not primary_ids and not extra_ids:
                not_found += 1
                continue
            pinyin = row['pinyin'].strip()
            primary.extend((cid, pinyin, hanviet) for cid in primary_ids)
            extra.extend((cid, pinyin, hanviet) for cid in extra_ids)
    return primary, extra, skipped, not_found


def run():
    require_source(CSV_PATH)
    conn = connect_dictionary()
    primary, extra, skipped, not_found = collect_readings(load_targets(conn))

    conn.execute('DELETE FROM sino_vietnamese')
    insert = 'INSERT INTO sino_vietnamese (character_id, pinyin, hanviet) VALUES (?, ?, ?)'
    conn.executemany(insert, primary)
    conn.executemany(insert, extra)
    conn.commit()
    conn.close()
    print(f'Hán Việt: {len(primary) + len(extra):,} rows imported, {skipped:,} empty/invalid, '
          f'{not_found:,} not in characters.')


if __name__ == '__main__':
    run()
