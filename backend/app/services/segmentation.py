"""
Forward Maximum Matching (FMM) segmentation over CC-CEDICT.

Result order:
  1. Multi-char words (in appearance order, deduped)
  2. Single chars that are NOT part of any multi-char word (deduped)
  3. Single chars that ARE part of a multi-char word (deduped)

Each token appears exactly once.
"""
from typing import List
from sqlmodel import Session, select
from app.models.character import CcCedictCharacter

MAX_WORD_LEN = 20


def _exists(session: Session, text: str) -> bool:
    return session.exec(
        select(CcCedictCharacter).where(CcCedictCharacter.simplified == text)
    ).first() is not None


def segment(session: Session, text: str) -> List[str]:
    text = text.strip()
    if not text:
        return []

    # ── Forward Maximum Matching ──────────────────────────
    words: List[str] = []
    i = 0
    while i < len(text):
        matched = None
        for length in range(min(MAX_WORD_LEN, len(text) - i), 0, -1):
            candidate = text[i : i + length]
            if length == 1 or _exists(session, candidate):
                matched = candidate
                break
        token = matched or text[i]
        words.append(token)
        i += len(token)

    # ── Categorise ────────────────────────────────────────
    multi: List[str] = []
    seen_multi: set[str] = set()

    for w in words:
        if len(w) > 1 and w not in seen_multi:
            multi.append(w)
            seen_multi.add(w)

    # chars covered by any multi-char word
    covered: set[str] = set("".join(multi))

    all_chars = list(dict.fromkeys(text))  # unique chars, order preserved

    free_singles    = [c for c in all_chars if c not in covered]
    covered_singles = [c for c in all_chars if c in covered]

    return multi + free_singles + covered_singles
