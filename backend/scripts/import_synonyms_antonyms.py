"""
Import synonym and antonym data into SQLite.

Sources:
  - data/dict_synonym.txt  — thesaurus groups, format: "GroupCode= word1 word2 word3..."
  - data/dict_antonym.txt  — antonym pairs,   format: "word1——word2" (or "word1──word2")

Tables populated:
  synonym_groups   — one row per group code
  synonym_members  — one row per (group, word)
  antonyms         — one row per pair (word1, word2)

Usage:
    cd backend && python scripts/import_synonyms_antonyms.py

The script is idempotent — re-running clears existing data and re-imports.
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, delete
from app.core.database import engine, init_db
from app.models.synonym_antonym import Antonym, SynonymGroup, SynonymMember

SYNONYM_FILE = Path(__file__).parent.parent / "data" / "dict_synonym.txt"
ANTONYM_FILE = Path(__file__).parent.parent / "data" / "dict_antonym.txt"

# Matches group lines: "Aa01A01= word1 word2 ..." or "Aa01A01# ..." or "Aa01A01@ ..."
_GROUP_RE = re.compile(r"^([A-Za-z0-9]+)[=@#]\s*(.+)$")

# Matches antonym pairs separated by —— or ──
_ANTONYM_SEP = re.compile(r"[\u2014\u2500]{2}")  # ——  or  ──


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
    init_db()

    synonym_groups = _parse_synonyms(SYNONYM_FILE)
    antonym_pairs = _parse_antonyms(ANTONYM_FILE)

    with Session(engine) as session:
        # Clear existing data
        session.exec(delete(SynonymMember))
        session.exec(delete(SynonymGroup))
        session.exec(delete(Antonym))
        session.commit()

        # ── Synonyms ─────────────────────────────────────────
        total_members = 0
        for code, words in synonym_groups.items():
            group = SynonymGroup(group_code=code)
            session.add(group)
            session.flush()  # get group.id
            for word in words:
                session.add(SynonymMember(group_id=group.id, word=word))
                total_members += 1
        session.commit()
        print(f"Synonyms: {len(synonym_groups)} groups, {total_members} members imported.")

        # ── Antonyms ─────────────────────────────────────────
        for w1, w2 in antonym_pairs:
            session.add(Antonym(word1=w1, word2=w2))
        session.commit()
        print(f"Antonyms: {len(antonym_pairs)} pairs imported.")


if __name__ == "__main__":
    run()
