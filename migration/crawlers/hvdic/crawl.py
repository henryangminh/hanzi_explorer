"""
Crawl hvdic.thivien.net (/whv/ and /wpy/ pages) for every dictionary word, into a separate,
permanent database (default migration/crawled/hvdic.db). Resumable: stop it any time
(Ctrl+C) and run it again to continue where it left off.

Usage:
    python migration/crawlers/hvdic/crawl.py               # crawl until everything is done
    python migration/crawlers/hvdic/crawl.py --max-words 5 # a short test run
    python migration/crawlers/hvdic/crawl.py --budget 1500 # fewer requests per 24h (default: pacer.BUDGET)
    python migration/crawlers/hvdic/crawl.py --status      # progress per priority tier + pacing health
"""
import argparse
import logging
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # migration/ for common.py
from common import DICTIONARY_DB  # noqa: E402

import store  # noqa: E402
from fetch import KINDS, AccessDenied, Fetcher, TransientError  # noqa: E402
from pacer import BUDGET, WINDOW, Pacer  # noqa: E402
from parse import extract_content, glyph_image_urls, parse  # noqa: E402
from targets import pending_words, progress  # noqa: E402

BATCH = 100                    # words picked per priority refresh
RETRY_WAITS = (60, 300, 900)   # seconds to back off after transient failures, then give up
DENIED_PAUSE = 3 * 3600        # site starts denying mid-crawl: pause this long, then check again…
DENIED_RECHECK = 30 * 60       # …and every 30 minutes while it still denies (also when denied from the start)
TIER_NAMES = {0: "single characters", 1: "2-char HSK words", 2: "2-char words listed by hvdic",
              3: "other 2-char words"}

log = logging.getLogger("hvdic")


def with_retry(pacer: Pacer, what: str, request, first_denied_wait: int = DENIED_PAUSE):
    """Run `request()` when the pacer allows it. Transient failures back off (re-raised after the last
    retry); while the site denies access, wait it out — `first_denied_wait`, then a check every
    30 minutes — and resume."""
    failures, denied = 0, False
    while True:
        pacer.before_request()
        try:
            result = request()
        except TransientError as exc:
            if failures == len(RETRY_WAITS):
                raise
            log.warning("%s failed (%s) — retry %d in %ds", what, exc, failures + 1, RETRY_WAITS[failures])
            pacer.sleep(RETRY_WAITS[failures])
            failures += 1
            continue
        except AccessDenied:
            wait = DENIED_RECHECK if denied else first_denied_wait
            denied = True
            log.warning("%s: access denied — checking again in %d minutes", what, wait // 60)
            pacer.sleep(wait)
            continue
        if denied:
            log.info("Access restored — resuming.")
        return result


def crawl_word(conn: sqlite3.Connection, fetcher: Fetcher, pacer: Pacer, word: str) -> list[str]:
    """Fetch and store what is missing for a word — pages, then glyph images; returns a short summary."""
    results = []
    missing = [k for k in KINDS if k not in store.done_kinds(conn, word)]
    for kind in missing:
        first_denied_wait = DENIED_PAUSE if fetcher.had_access else DENIED_RECHECK
        status, html = with_retry(pacer, f"{kind}/{word}", lambda: fetcher.get(kind, word), first_denied_wait)
        content = extract_content(html) if status == 200 else None
        data = parse(content) if content else None
        store.save_page(conn, word, kind, status, content is not None, content, data)
        if data:
            store.add_image_refs(conn, word, glyph_image_urls(data))
        results.append(f"{kind}:{'ok' if content else '-'}")

    images = store.pending_images(conn, word)
    for url in images:
        status, body, content_type = with_retry(pacer, url, lambda: fetcher.get_image(url))
        store.save_image(conn, url, status, body if status == 200 else None, content_type)
    if images:
        results.append(f"img:{len(images)}")
    return results


def run(max_words: int | None, budget: int) -> None:
    dictionary = sqlite3.connect(f"file:{DICTIONARY_DB}?mode=ro", uri=True)
    conn = store.connect()
    fetcher = Fetcher()
    pacer = Pacer(store.request_times(conn, datetime.now(timezone.utc) - timedelta(seconds=WINDOW)),
                  budget=budget, log=log.info)
    log.info("Started — budget %d requests per 24h (one every ~%.0fs).", budget, pacer.interval)
    crawled = 0
    try:
        while max_words is None or crawled < max_words:
            batch = pending_words(dictionary, conn, BATCH)
            if not batch:
                log.info("Everything is crawled.")
                return
            for word, tier in batch:
                if max_words is not None and crawled >= max_words:
                    return
                results = crawl_word(conn, fetcher, pacer, word)
                crawled += 1
                log.info("[tier %d] %s %s", tier, word, " ".join(results))
    except KeyboardInterrupt:
        log.info("Stopped — run again to resume.")
    except TransientError as exc:
        log.error("Giving up after repeated failures (%s). The site may be blocking or down; run again later.", exc)
        sys.exit(1)
    finally:
        fetcher.close()
        log.info("Crawled %d words this run.", crawled)


def denials_since(log_file: Path, since: datetime) -> list[str]:
    """Log lines of the site denying access (one per check while blocked) since `since` (local time)."""
    if not log_file.exists():
        return []
    stamp = since.strftime("%Y-%m-%d %H:%M:%S")
    with open(log_file, encoding="utf-8") as f:
        return [line.rstrip() for line in f if "access denied" in line and line[:19] >= stamp]


def show_health(conn: sqlite3.Connection, log_file: Path) -> None:
    """Is the pacing still under the site's limit? Denials while pacing means the limit changed."""
    now = datetime.now()
    used = len(store.request_times(conn, datetime.now(timezone.utc) - timedelta(seconds=WINDOW)))
    day, week = denials_since(log_file, now - timedelta(days=1)), denials_since(log_file, now - timedelta(days=7))
    print(f"requests in the last 24h: {used:,} (budget {BUDGET:,}; site limit observed ~2,000)")
    print(f"access-denied checks: {len(day)} in 24h, {len(week)} in 7 days")
    if week:
        print(f"last denial: {week[-1][:19]}")


def show_status() -> None:
    dictionary = sqlite3.connect(f"file:{DICTIONARY_DB}?mode=ro", uri=True)
    conn = store.connect()
    remaining_words = remaining_requests = 0
    per_char = len(KINDS) + store.images_per_character(conn)
    for tier, (done, total) in progress(dictionary, conn).items():
        remaining_words += total - done
        remaining_requests += (total - done) * (per_char if tier == 0 else len(KINDS))
        print(f"tier {tier} {TIER_NAMES[tier]:<29} {done:>7,} / {total:>7,}")
    found = dict(conn.execute("SELECT kind, SUM(found) || '/' || COUNT(*) FROM pages GROUP BY kind").fetchall())
    print(f"pages with content: {found}")
    per_day = Pacer().requests_per_day()
    print(f"remaining: {remaining_words:,} words ≈ {remaining_requests:,.0f} requests "
          f"≈ {remaining_requests / per_day:.1f} days at {per_day:,.0f} requests/day")
    show_health(conn, store.HVDIC_DB.with_suffix(".log"))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--max-words", type=int, help="stop after this many words")
    parser.add_argument("--budget", type=int, default=BUDGET, help="max requests per rolling 24h")
    parser.add_argument("--status", action="store_true", help="show progress and exit")
    args = parser.parse_args()

    log_file = store.HVDIC_DB.with_suffix(".log")
    log_file.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s",
                        handlers=[logging.StreamHandler(), logging.FileHandler(log_file, encoding="utf-8")])
    logging.getLogger("httpx").setLevel(logging.WARNING)  # one line per word is enough
    if args.status:
        show_status()
    else:
        run(args.max_words, args.budget)


if __name__ == "__main__":
    main()
