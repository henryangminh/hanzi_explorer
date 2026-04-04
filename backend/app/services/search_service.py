"""Search service: three modes for dictionary lookup.

- sentence: Input has 4+ Chinese chars → extract ALL sub-words from the sentence
- short: Input has 1-3 Chinese chars → extract sub-words + prefix extensions sorted by length
- pinyin: Input has no Chinese chars → search by pinyin
"""
import re
from typing import List, Tuple

from sqlmodel import Session, select
from sqlalchemy import func

from app.models.character import CcCedictCharacter


def _is_chinese_char(c: str) -> bool:
    return '\u4e00' <= c <= '\u9fff' or '\u3400' <= c <= '\u4dbf'


def traditional_to_simplified(session: Session, text: str) -> str:
    """
    Convert any traditional-only characters in text to simplified.
    Characters that are already simplified (or not Chinese) are kept as-is.
    Works character-by-character so mixed input is handled correctly.
    """
    from app.models.character import CcCedictCharacter

    unique_chars = list({c for c in text if _is_chinese_char(c)})
    if not unique_chars:
        return text

    # t→s candidates: rows where traditional is one of our chars
    trad_rows = session.exec(
        select(CcCedictCharacter.traditional, CcCedictCharacter.simplified)
        .where(CcCedictCharacter.traditional.in_(unique_chars))
        .distinct()
    ).all()

    # chars that already exist as simplified entries — keep them as-is
    simp_set: set[str] = set(session.exec(
        select(CcCedictCharacter.simplified)
        .where(CcCedictCharacter.simplified.in_(unique_chars))
        .distinct()
    ).all())

    t2s: dict[str, str] = {}
    for trad, simp in trad_rows:
        if trad and simp and trad != simp and trad not in simp_set:
            t2s[trad] = simp

    if not t2s:
        return text

    return ''.join(t2s.get(c, c) for c in text)


def detect_search_mode(text: str) -> str:
    """Returns 'sentence', 'short', or 'pinyin'."""
    chinese_chars = [c for c in text if _is_chinese_char(c)]
    if not chinese_chars:
        return 'pinyin'
    if len(chinese_chars) <= 3:
        return 'short'
    return 'sentence'


# ── Sentence mode ─────────────────────────────────────────

def extract_all_words(session: Session, text: str) -> List[str]:
    """
    Extract ALL dictionary sub-words from a sentence.

    Multi-char words: sorted by length desc, then by first appearance position.
    Single chars: in order of appearance, deduped.

    Example: 我不知道 → [知道, 不知, 我, 不, 知, 道]
    Example: 不客气  → [不客气, 客气, 不, 客, 气]
    """
    possible: set = set()
    positions: dict = {}
    for i in range(len(text)):
        for length in range(2, len(text) - i + 1):
            sub = text[i:i + length]
            if sub not in possible:
                possible.add(sub)
                positions[sub] = i

    existing = set(session.exec(
        select(CcCedictCharacter.simplified)
        .where(CcCedictCharacter.simplified.in_(list(possible)))
        .distinct()
    ).all())

    candidates: List[Tuple[int, int, str]] = [
        (positions[w], len(w), w) for w in existing
    ]
    candidates.sort(key=lambda x: (-x[1], x[0]))

    result: List[str] = [c[2] for c in candidates]
    seen: set = set(result)

    for c in text:
        if c not in seen:
            result.append(c)
            seen.add(c)

    return result


# ── Short mode ────────────────────────────────────────────

def short_search(session: Session, query: str) -> List[str]:
    """
    For 1-3 Chinese chars:
    1. Extract sub-words from input (e.g. 不客气 → 不客气, 客气)
    2. Append prefix extensions — words STARTING with the full query that are
       longer than the query (e.g. 指导 → 指导课, 指导员)
    3. Append individual chars from input

    Result for 不客气: [不客气, 客气, 不, 客, 气]
    Result for 指导:   [指导, 指导课, 指导员, ..., 指, 导]
    """
    # Step 1 & 3: sub-word extraction gives multi-char words + individual chars
    sub_result = extract_all_words(session, query)
    seen: set = set(sub_result)

    multi_words = [w for w in sub_result if len(w) > 1]
    single_chars = [w for w in sub_result if len(w) == 1]

    # Step 2: prefix extensions (words starting with full query, longer than query)
    prefix_rows = session.exec(
        select(CcCedictCharacter.simplified)
        .where(CcCedictCharacter.simplified.like(f'{query}%'))
        .distinct()
    ).all()

    extensions: List[str] = []
    for word in prefix_rows:
        if word not in seen and len(word) > len(query):
            extensions.append(word)
            seen.add(word)

    # Sort extensions: shorter first (= higher match ratio = shown before longer ones)
    extensions.sort(key=lambda w: len(w))

    # Put exact match first so the query itself always appears before prefix extensions.
    # This matters especially for single-char queries where the char would otherwise
    # end up after all extensions (e.g. searching "指" should show 指 before 指导).
    exact = [w for w in (multi_words + single_chars) if w == query]
    other_multi = [w for w in multi_words if w != query]
    other_singles = [w for w in single_chars if w != query]

    return exact + other_multi + extensions + other_singles


# ── Pinyin mode ───────────────────────────────────────────

def _norm_db_pinyin_no_tones(col):
    """SQLAlchemy expression: lower(pinyin) with spaces and tone digits removed."""
    expr = func.lower(col)
    expr = func.replace(expr, ' ', '')
    for d in '12345':
        expr = func.replace(expr, d, '')
    return expr


def _norm_db_pinyin_no_spaces(col):
    """SQLAlchemy expression: lower(pinyin) with only spaces removed."""
    return func.replace(func.lower(col), ' ', '')


def pinyin_search(session: Session, pinyin_input: str) -> List[str]:
    """
    Search by pinyin. Two sub-modes:
    - No digits in input (e.g. bukeqi): strip tones from DB pinyin for comparison
    - Digits in input (e.g. ming2tian1): keep tone digits, only strip spaces

    Returns list of simplified words, sorted by pinyin match length desc.
    """
    raw = pinyin_input.strip().lower()
    has_digits = bool(re.search(r'\d', raw))

    if has_digits:
        normalized_input = re.sub(r'\s', '', raw)
        norm_db_expr = _norm_db_pinyin_no_spaces(CcCedictCharacter.pinyin)
    else:
        normalized_input = re.sub(r'\s', '', raw)
        norm_db_expr = _norm_db_pinyin_no_tones(CcCedictCharacter.pinyin)

    stmt = (
        select(CcCedictCharacter.simplified, CcCedictCharacter.pinyin)
        .where(norm_db_expr.like(f'{normalized_input}%'))
        .distinct()
    )
    rows = session.exec(stmt).all()

    seen: set = set()
    results: List[Tuple[str, float]] = []
    for simplified, pinyin in rows:
        if simplified not in seen:
            seen.add(simplified)
            if has_digits:
                db_norm = pinyin.replace(' ', '').lower()
            else:
                db_norm = re.sub(r'[\s0-9]', '', pinyin.lower())

            if db_norm == normalized_input:
                score = 100.0
            elif len(db_norm) > 0:
                score = round(len(normalized_input) / len(db_norm) * 100, 2)
            else:
                score = 0.0

            results.append((simplified, score))

    results.sort(key=lambda x: (-x[1], len(x[0])))
    return [r[0] for r in results]
