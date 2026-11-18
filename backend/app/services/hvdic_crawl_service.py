"""Progress of the hvdic crawl (migration/crawlers/hvdic), read from its own database and log."""
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlmodel import Session, select

from app.models.character import Character
from app.schemas.data_source import CrawlStatus

BUDGET_24H = 1900      # requests per rolling 24h — pacer.BUDGET in migration/crawlers/hvdic
PAGES_PER_WORD = 2     # 'whv' + 'wpy' pages per word
# Han ideographs only — words with letters, digits or symbols are not crawled (targets.py)
_HAN = re.compile(r"^[\u3007\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\U00020000-\U0003134f]+$")


def _targets(session: Session) -> tuple[set[str], set[str]]:
    """(single characters, two-character words) the crawl aims for."""
    words = [w for w in session.exec(select(Character.simplified)).all() if len(w) <= 2 and _HAN.match(w)]
    return {w for w in words if len(w) == 1}, {w for w in words if len(w) == 2}


def _denials(log_file: Path, since: datetime) -> int:
    """Access-denied checks logged since `since` (the log is in local time)."""
    if not log_file.exists():
        return 0
    stamp = since.strftime("%Y-%m-%d %H:%M:%S")
    with open(log_file, encoding="utf-8") as f:
        return sum(1 for line in f if "access denied" in line and line[:19] >= stamp)


def get_status(session: Session, db_path: Path) -> CrawlStatus | None:
    """None when the crawl database is not on this machine."""
    if not db_path.exists():
        return None
    since = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    # Raw SQL: the crawl database belongs to migration/ (its schema lives in store.py), not to the app's ORM models
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        done = {w for (w,) in conn.execute("SELECT word FROM pages GROUP BY word HAVING COUNT(*) = ?", (PAGES_PER_WORD,))}
        requests = conn.execute(
            "SELECT (SELECT COUNT(*) FROM pages WHERE fetched_at > :s) + (SELECT COUNT(*) FROM glyph_images WHERE fetched_at > :s)",
            {"s": since},
        ).fetchone()[0]
        last = conn.execute("SELECT MAX(fetched_at) FROM pages").fetchone()[0]
    finally:
        conn.close()

    chars, words = _targets(session)
    chars_done, words_done = len(chars & done), len(words & done)
    remaining = len(chars) - chars_done + len(words) - words_done
    now = datetime.now()
    log_file = db_path.with_suffix(".log")
    return CrawlStatus(
        chars_done=chars_done,
        chars_total=len(chars),
        words_done=words_done,
        words_total=len(words),
        requests_24h=requests,
        budget_24h=BUDGET_24H,
        denials_24h=_denials(log_file, now - timedelta(days=1)),
        denials_7d=_denials(log_file, now - timedelta(days=7)),
        last_request_at=datetime.fromisoformat(last) if last else None,
        eta_days=remaining * PAGES_PER_WORD / BUDGET_24H,
    )
