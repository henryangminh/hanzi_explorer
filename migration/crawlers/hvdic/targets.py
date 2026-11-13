"""Which words to crawl next, in priority order. Only single characters and two-character words are
crawled ahead of time; longer words are left for later (to be fetched when looked up)."""
import json
import re
import sqlite3

from fetch import KINDS
from store import completed_words

MAX_LENGTH = 2
# Han ideographs (CJK unified + extensions, compatibility ideographs, 〇). Words with anything else —
# letters, digits, symbols, radical forms (A股, T恤, %, □, ⺮) — have no useful page on hvdic.
_HAN = re.compile(r"^[\u3007\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\U00020000-\U0003134f]+$")


def _tier(word: str, listed_by_site: set[str], in_hsk: bool) -> int | None:
    """0 single characters · 1 HSK two-character words (any scheme) · 2 two-character words the site
    lists under a character · 3 other two-character words · None when not crawled (longer words, non-Han).
    Within a tier, more frequent words come first."""
    if len(word) > MAX_LENGTH or not _HAN.match(word):
        return None
    if len(word) == 1:
        return 0
    if in_hsk:
        return 1
    return 2 if word in listed_by_site else 3


def _listed_by_site(hvdic: sqlite3.Connection) -> set[str]:
    """Compound words that appear in the "Từ ghép" lists of pages crawled so far."""
    listed: set[str] = set()
    for (data,) in hvdic.execute("SELECT data FROM pages WHERE found = 1 AND data LIKE '%\"compounds\"%'"):
        for entry in json.loads(data).get("entries", []):
            listed.update(c["word"] for c in entry.get("compounds", []))
    return listed


def pending_words(dictionary: sqlite3.Connection, hvdic: sqlite3.Connection, limit: int) -> list[tuple[str, int]]:
    """Up to `limit` (word, tier) not fully crawled yet, best first."""
    done = completed_words(hvdic, KINDS)
    listed = _listed_by_site(hvdic)
    hsk = {w for (w,) in dictionary.execute("SELECT simplified FROM hsk_words")}
    candidates = []
    for word, frequency, row_id in dictionary.execute("SELECT simplified, frequency, id FROM characters"):
        if word in done:
            continue
        tier = _tier(word, listed, word in hsk)
        if tier is None:
            continue
        candidates.append((tier, frequency is None, frequency or 0, len(word), row_id, word))
    candidates.sort()
    return [(c[-1], c[0]) for c in candidates[:limit]]


def progress(dictionary: sqlite3.Connection, hvdic: sqlite3.Connection) -> dict[int, tuple[int, int]]:
    """{tier: (done, total)} over all dictionary words."""
    done = completed_words(hvdic, KINDS)
    listed = _listed_by_site(hvdic)
    hsk = {w for (w,) in dictionary.execute("SELECT simplified FROM hsk_words")}
    totals: dict[int, list[int]] = {}
    for word, frequency in dictionary.execute("SELECT simplified, frequency FROM characters"):
        tier = _tier(word, listed, word in hsk)
        if tier is None:
            continue
        counts = totals.setdefault(tier, [0, 0])
        counts[1] += 1
        counts[0] += word in done
    return {tier: (d, t) for tier, (d, t) in sorted(totals.items())}
