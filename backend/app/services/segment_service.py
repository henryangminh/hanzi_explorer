"""Splitting a Chinese text into dictionary words, for the reading assistant."""
import json
import re

from pypinyin import Style, pinyin
from sqlalchemy import column, table
from sqlmodel import Session, select

from app.models import DICTIONARY_SCHEMA
from app.models.character import Character
from app.models.flashcard import UserFlashcard
from app.schemas.reader import ReaderToken
from app.services.search_service import traditional_to_simplified

MAX_WORD_LENGTH = 8
_NO_FREQ = 999_999   # words without a frequency rank count as rare
_CHUNK = 500         # stay well below SQLite's bound-parameter limit
_CHINESE_RUN = re.compile(r'[一-鿿㐀-䶿]+')
_HSK_WORDS = table("hsk_words", column("simplified"), column("levels"), schema=DICTIONARY_SCHEMA)


def segment_run(run: str, ranks: dict[str, int]) -> list[str]:
    """
    Split a run of Chinese characters into the fewest dictionary words (`ranks`: word → frequency
    rank, lower = more common); ties go to the more common words. A character that starts no
    dictionary word stands alone.
    """
    n = len(run)
    # best[i] = (word count, total rank, start of the last word) of the best split of run[:i]
    best: list[tuple[int, int, int] | None] = [None] * (n + 1)
    best[0] = (0, 0, -1)
    for i in range(n):
        count, cost, _ = best[i]
        for length in range(1, min(MAX_WORD_LENGTH, n - i) + 1):
            word = run[i:i + length]
            if length > 1 and word not in ranks:
                continue
            candidate = (count + 1, cost + ranks.get(word, _NO_FREQ), i)
            current = best[i + length]
            if current is None or candidate[:2] < current[:2]:
                best[i + length] = candidate

    words: list[str] = []
    end = n
    while end > 0:
        start = best[end][2]
        words.append(run[start:end])
        end = start
    return words[::-1]


def _dictionary_words(session: Session, runs: list[str]) -> dict[str, int]:
    """Every dictionary word inside the runs, with its frequency rank."""
    candidates = {
        run[i:i + length]
        for run in runs
        for i in range(len(run))
        for length in range(1, min(MAX_WORD_LENGTH, len(run) - i) + 1)
    }
    found: dict[str, int] = {}
    pending = list(candidates)
    for k in range(0, len(pending), _CHUNK):
        for simp, freq in session.exec(
            select(Character.simplified, Character.frequency)
            .where(Character.simplified.in_(pending[k:k + _CHUNK]))
        ).all():
            found.setdefault(simp, freq if freq is not None else _NO_FREQ)
    return found


def _statuses(session: Session, user_id: int, words: list[str]) -> dict[str, str | None]:
    statuses: dict[str, str | None] = {}
    for k in range(0, len(words), _CHUNK):
        for char, status in session.exec(
            select(UserFlashcard.char, UserFlashcard.status)
            .where(UserFlashcard.user_id == user_id)
            .where(UserFlashcard.char.in_(words[k:k + _CHUNK]))
        ).all():
            statuses[char] = status
    return statuses


def parse_hsk_levels(levels: list[str]) -> dict[str, int]:
    """["newest-3", "new-4", "old-3"] → {"newest": 3, "new": 4, "old": 3}, the lowest level per standard."""
    parsed: dict[str, int] = {}
    for item in levels:
        standard, _, level = item.rpartition('-')
        if standard and level.isdigit():
            parsed[standard] = min(int(level), parsed.get(standard, int(level)))
    return parsed


def _hsk_levels(session: Session, words: list[str]) -> dict[str, dict[str, int]]:
    found: dict[str, dict[str, int]] = {}
    for k in range(0, len(words), _CHUNK):
        for simp, levels in session.exec(
            select(_HSK_WORDS.c.simplified, _HSK_WORDS.c.levels)
            .where(_HSK_WORDS.c.simplified.in_(words[k:k + _CHUNK]))
        ).all():
            found[simp] = parse_hsk_levels(json.loads(levels))
    return found


def segment_text(session: Session, user_id: int, text: str) -> list[ReaderToken]:
    """The text as tokens: dictionary words (with pinyin, the user's status and HSK levels) and everything in between."""
    simplified = traditional_to_simplified(session, text)  # same length: converted char by char
    runs = [m for m in _CHINESE_RUN.finditer(simplified)]
    ranks = _dictionary_words(session, [m.group() for m in runs])

    tokens: list[ReaderToken] = []
    pos = 0
    for m in runs:
        if m.start() > pos:
            tokens.append(ReaderToken(text=text[pos:m.start()]))
        # Readings from the whole run, so polyphones follow their context (银行 háng, 行长 zhǎng)
        readings = [p[0] for p in pinyin(m.group(), style=Style.TONE)]
        offset = 0
        for word in segment_run(m.group(), ranks):
            start = m.start() + offset
            tokens.append(ReaderToken(
                text=text[start:start + len(word)],
                word=word if word in ranks else None,
                pinyin=' '.join(readings[offset:offset + len(word)]),
            ))
            offset += len(word)
        pos = m.end()
    if pos < len(text):
        tokens.append(ReaderToken(text=text[pos:]))

    words = list({t.word for t in tokens if t.word})
    statuses = _statuses(session, user_id, words)
    hsk = _hsk_levels(session, words)
    for t in tokens:
        if t.word:
            t.status = statuses.get(t.word)
            t.hsk = hsk.get(t.word, {})
    return tokens
