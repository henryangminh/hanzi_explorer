"""
Import synonym and antonym data into dictionary.db.

Sources:
  - sources/dict_synonym.txt  — thesaurus groups, format: "GroupCode= word1 word2 word3..."
  - sources/dict_antonym.txt  — antonym pairs,   format: "word1——word2" (or "word1──word2")

Tables populated:
  synonym_groups   — one row per group code
  synonym_members  — one row per (group, word)
  antonyms         — one row per pair (word1, word2)

Idempotent: re-running clears existing data and re-imports.

Usage:
    python migration/dictionary/05_import_synonyms_antonyms.py
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import SOURCES_DIR, connect_dictionary, require_source  # noqa: E402

SYNONYM_FILE = SOURCES_DIR / "dict_synonym.txt"
ANTONYM_FILE = SOURCES_DIR / "dict_antonym.txt"

# Matches group lines: "Aa01A01= word1 word2 ..." or "Aa01A01# ..." or "Aa01A01@ ..."
_GROUP_RE = re.compile(r"^([A-Za-z0-9]+)[=@#]\s*(.+)$")

# Matches antonym pairs separated by —— or ──
_ANTONYM_SEP = re.compile(r"[—─]{2}")  # ——  or  ──


def _parse_synonyms(path: Path) -> dict[str, list[str]]:
    """Parse synonym file into {group_code: [word, ...]} dict."""
    groups: dict[str, list[str]] = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            m = _GROUP_RE.match(line)
            if not m:
                continue
            code, rest = m.group(1), m.group(2)
            words = [w.strip() for w in rest.split() if w.strip()]
            if words:
                groups.setdefault(code, []).extend(words)
    return groups


def _parse_antonyms(path: Path) -> list[tuple[str, str]]:
    """Parse antonym file into list of (word1, word2) pairs."""
    pairs: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = _ANTONYM_SEP.split(line)
            if len(parts) != 2:
                continue
            w1, w2 = parts[0].strip(), parts[1].strip()
            if not w1 or not w2:
                continue
            key = (w1, w2)
            rev = (w2, w1)
            if key not in seen and rev not in seen:
                pairs.append(key)
                seen.add(key)
    return pairs


def run() -> None:
    synonym_groups = _parse_synonyms(require_source(SYNONYM_FILE))
    antonym_pairs = _parse_antonyms(require_source(ANTONYM_FILE))

    conn = connect_dictionary()
    conn.execute("DELETE FROM synonym_members")
    conn.execute("DELETE FROM synonym_groups")
    conn.execute("DELETE FROM antonyms")

    total_members = 0
    for code, words in synonym_groups.items():
        group_id = conn.execute("INSERT INTO synonym_groups (group_code) VALUES (?)", (code,)).lastrowid
        conn.executemany(
            "INSERT INTO synonym_members (group_id, word) VALUES (?, ?)", [(group_id, w) for w in words]
        )
        total_members += len(words)
    conn.executemany("INSERT INTO antonyms (word1, word2) VALUES (?, ?)", antonym_pairs)

    conn.commit()
    conn.close()
    print(f"Synonyms: {len(synonym_groups):,} groups, {total_members:,} members. Antonyms: {len(antonym_pairs):,} pairs.")


if __name__ == "__main__":
    run()
