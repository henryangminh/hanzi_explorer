"""Slowing down password guessing: too many failed logins for one username from one address are refused for a while."""
import time
from collections import defaultdict

MAX_FAILURES = 5
WINDOW_SECONDS = 15 * 60

# (client address, lowercased username) → times of recent failed logins. In memory: one server process.
_failures: dict[tuple[str, str], list[float]] = defaultdict(list)


def _recent(key: tuple[str, str], now: float) -> list[float]:
    times = [t for t in _failures.get(key, []) if now - t < WINDOW_SECONDS]
    if times:
        _failures[key] = times
    else:
        _failures.pop(key, None)
    return times


def retry_after(client: str, username: str) -> int:
    """Seconds until this client may try this username again; 0 when it may now."""
    now = time.monotonic()
    times = _recent((client, username.lower()), now)
    if len(times) < MAX_FAILURES:
        return 0
    return int(times[0] + WINDOW_SECONDS - now) + 1


def record_failure(client: str, username: str) -> None:
    _failures[(client, username.lower())].append(time.monotonic())


def clear(client: str, username: str) -> None:
    """A successful login forgets the earlier failures."""
    _failures.pop((client, username.lower()), None)


def reset() -> None:
    _failures.clear()
