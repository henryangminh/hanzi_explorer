"""Politeness: stay under the site's request limit.

Observed in October 2026: hvdic denies access once an IP has made ~2,000 requests (pages and images
alike) in the last 24 hours, and lets it back in as old requests leave that rolling window. So we
allow at most BUDGET requests per 24 hours, spread evenly (one every ~45 s), counting the requests
already made before a restart.
"""
import random
import time
from collections import deque

WINDOW = 24 * 3600
BUDGET = 1900  # 5% under the observed limit


class Pacer:
    def __init__(self, history: list[float] = (), budget: int = BUDGET, window: float = WINDOW, jitter: float = 3,
                 log=print, sleep=time.sleep, clock=time.time):
        """`history`: epoch times of requests already made (e.g. from the database)."""
        self.budget, self.window, self.jitter = budget, window, jitter
        self.interval = window / budget
        self.log, self.sleep, self.clock = log, sleep, clock
        self.recent = deque(sorted(t for t in history if t > clock() - window))

    def before_request(self) -> None:
        """Wait until one more request fits in the budget and is evenly spaced, then count it."""
        now = self.clock()
        while self.recent and self.recent[0] <= now - self.window:
            self.recent.popleft()
        wait = 0.0
        if len(self.recent) >= self.budget:
            wait = self.recent[-self.budget] + self.window - now
        if self.recent:
            wait = max(wait, self.recent[-1] + self.interval + random.uniform(0, self.jitter) - now)
        if wait > 600:
            self.log(f"Request budget for the last 24h used up — waiting {wait / 60:.0f} minutes")
        if wait > 0:
            self.sleep(wait)
        self.recent.append(self.clock())

    def requests_per_day(self) -> float:
        return self.budget * 86400 / self.window
