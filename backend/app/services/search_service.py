"""Search service: three modes for dictionary lookup.

- sentence: Input has 4+ Chinese chars → extract ALL sub-words from the sentence
- short: Input has 1-3 Chinese chars → extract sub-words + prefix extensions sorted by length
- pinyin: Input has no Chinese chars → search by pinyin
"""
import re
from typing import List, Tuple

from sqlmodel import Session, select
from sqlalchemy import func

from app.core.pinyin import diacritic_to_numeric
from app.models.character import Character, PinyinReading

_NO_FREQ = 999_999  # sentinel for NULL frequency — sort last
MAX_PINYIN_RESULTS = 30


def _freq_map(session: Session, words: List[str]) -> dict[str, int]:
    """Bulk-fetch frequency for a list of simplified words. NULL → _NO_FREQ."""
    if not words:
        return {}
    rows = session.exec(
        select(Character.simplified, Character.frequency)
        .where(Character.simplified.in_(words))
    ).all()
    return {
        simp: (freq if freq is not None else _NO_FREQ)
        for simp, freq in rows
    }


def _like_prefix(text: str) -> str:
    """LIKE pattern matching values that start with `text` (its % and _ taken literally; use escape='\\')."""
    return text.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'


def _is_chinese_char(c: str) -> bool:
    return '\u4e00' <= c <= '\u9fff' or '\u3400' <= c <= '\u4dbf'


def traditional_to_simplified(session: Session, text: str) -> str:
    """
    Convert any traditional-only characters in text to simplified.
    Characters that are already simplified (or not Chinese) are kept as-is.
    Works character-by-character so mixed input is handled correctly.
    """
    unique_chars = list({c for c in text if _is_chinese_char(c)})
    if not unique_chars:
        return text

    # t→s candidates: rows where traditional is one of our chars
    trad_rows = session.exec(
        select(Character.traditional, Character.simplified)
        .where(Character.traditional.in_(unique_chars))
        .distinct()
    ).all()

    # chars that already exist as simplified entries — keep them as-is
    simp_set: set[str] = set(session.exec(
        select(Character.simplified)
        .where(Character.simplified.in_(unique_chars))
        .distinct()
    ).all())

    t2s: dict[str, str] = {}
    for trad, simp in trad_rows:
        if trad and simp and trad != simp and trad not in simp_set:
            t2s[trad] = simp

    # Characters only listed inside words (館 in 圖書館): take the simplified char at the same position
    for c in unique_chars:
        if c in t2s or c in simp_set:
            continue
        word = session.exec(
            select(Character.traditional, Character.simplified)
            .where(Character.traditional.contains(c, autoescape=True))
            .limit(1)
        ).first()
        if word and len(word[0]) == len(word[1]):
            t2s[c] = word[1][word[0].index(c)]

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
        select(Character.simplified)
        .where(Character.simplified.in_(list(possible)))
        .distinct()
    ).all())

    freq = _freq_map(session, list(existing) + [c for c in text if _is_chinese_char(c)])

    candidates: List[Tuple[int, int, str]] = [
        (positions[w], len(w), w) for w in existing
    ]
    candidates.sort(key=lambda x: (-x[1], x[0], freq.get(x[2], _NO_FREQ)))

    result: List[str] = [c[2] for c in candidates]
    seen: set = set(result)

    trailing: List[str] = []
    for c in text:
        if c not in seen and _is_chinese_char(c):
            trailing.append(c)
            seen.add(c)
    trailing.sort(key=lambda c: freq.get(c, _NO_FREQ))
    result.extend(trailing)

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
    sub_result = extract_all_words(session, query)
    seen: set = set(sub_result)

    multi_words = [w for w in sub_result if len(w) > 1]
    single_chars = [w for w in sub_result if len(w) == 1]

    # Step 2: prefix extensions (words starting with full query, longer than query)
    prefix_rows = session.exec(
        select(Character.simplified)
        .where(Character.simplified.like(_like_prefix(query), escape='\\'))
        .distinct()
    ).all()

    extensions: List[str] = []
    for word in prefix_rows:
        if word not in seen and len(word) > len(query):
            extensions.append(word)
            seen.add(word)

    ext_freq = _freq_map(session, extensions)
    extensions.sort(key=lambda w: (len(w), ext_freq.get(w, _NO_FREQ)))

    exact = [w for w in (multi_words + single_chars) if w == query]
    other_multi = [w for w in multi_words if w != query]
    other_singles = [w for w in single_chars if w != query]

    return exact + other_multi + extensions + other_singles


# ── Pinyin mode ───────────────────────────────────────────

def _norm_db_pinyin_no_tones(col):
    """SQLAlchemy expression: lower(col) with spaces and tone digits removed, ü (u:) as v."""
    expr = _norm_db_pinyin_no_spaces(col)
    for d in '12345':
        expr = func.replace(expr, d, '')
    return expr


def _norm_db_pinyin_no_spaces(col):
    """SQLAlchemy expression: lower(col) with spaces removed, ü (stored as u:) as v."""
    return func.replace(func.replace(func.lower(col), ' ', ''), 'u:', 'v')


def pinyin_search(session: Session, pinyin_input: str) -> List[str]:
    """
    Search by pinyin. Two sub-modes:
    - No digits in input (e.g. bukeqi): strip tones from DB pinyin for comparison
    - Digits in input (e.g. ming2tian1, or tone marks: míngtiān): keep tone digits, only strip spaces
    ü can be typed as ü, v or u: (lü4, lv4, lu:4).

    Returns list of simplified words, sorted by pinyin match length desc.
    """
    raw = diacritic_to_numeric(pinyin_input.strip().lower()).replace('ü', 'v').replace('u:', 'v')
    has_digits = bool(re.search(r'\d', raw))
    normalized_input = re.sub(r"[\s']", '', raw)

    if has_digits:
        norm_db_expr = _norm_db_pinyin_no_spaces(PinyinReading.pinyin_numeric)
    else:
        norm_db_expr = _norm_db_pinyin_no_tones(PinyinReading.pinyin_numeric)

    stmt = (
        select(Character.simplified, PinyinReading.pinyin_numeric)
        .join(PinyinReading, PinyinReading.character_id == Character.id)
        .where(norm_db_expr.like(_like_prefix(normalized_input), escape='\\'))
        .distinct()
    )
    rows = session.exec(stmt).all()

    seen: set = set()
    results: List[Tuple[str, float]] = []
    for simplified, pinyin_num in rows:
        if simplified not in seen:
            seen.add(simplified)
            if not pinyin_num:
                continue
            db_norm = pinyin_num.replace(' ', '').lower().replace('u:', 'v')
            if not has_digits:
                db_norm = re.sub(r'[0-9]', '', db_norm)

            if db_norm == normalized_input:
                score = 100.0
            elif len(db_norm) > 0:
                score = round(len(normalized_input) / len(db_norm) * 100, 2)
            else:
                score = 0.0

            results.append((simplified, score))

    freq = _freq_map(session, [r[0] for r in results])
    results.sort(key=lambda x: (-x[1], len(x[0]), freq.get(x[0], _NO_FREQ)))
    return [r[0] for r in results]


# ── Entry point ───────────────────────────────────────────

def find_words(session: Session, query: str) -> List[str]:
    """Dictionary words to show for a (simplified) search query, using the mode the query implies."""
    mode = detect_search_mode(query)
    if mode == 'sentence':
        return extract_all_words(session, query)
    if mode == 'short':
        return short_search(session, query)
    return pinyin_search(session, query)[:MAX_PINYIN_RESULTS]
