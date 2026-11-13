"""HTTP access to hvdic.thivien.net (robots.txt allows /whv/ and /wpy/)."""
from urllib.parse import quote

import httpx

BASE_URL = "https://hvdic.thivien.net"
HEADERS = {"User-Agent": "HanziExplorer/1.0 (personal study tool; slow crawler, 1 word / 30s)"}
KINDS = ("whv", "wpy")


class TransientError(Exception):
    """Network error, rate limiting or server error — worth retrying later."""


class AccessDenied(Exception):
    """The site refused us (its "access denied" page, served with HTTP 200) — stop, never retry."""


DENIED_MARKER = "truy cập của bạn đã bị từ chối"


class Fetcher:
    def __init__(self, timeout: float = 20):
        self.client = httpx.Client(headers=HEADERS, timeout=timeout, follow_redirects=True)
        self.had_access = False  # has the site served a page since this crawler started?

    def get(self, kind: str, word: str) -> tuple[int, str]:
        """(HTTP status, body) for 200 and 404; raises AccessDenied when blocked, TransientError otherwise."""
        try:
            resp = self.client.get(f"{BASE_URL}/{kind}/{quote(word, safe='')}")
        except httpx.HTTPError as exc:
            raise TransientError(str(exc)) from exc
        if DENIED_MARKER in resp.text:
            raise AccessDenied(resp.text.strip()[:200])
        self.had_access = True
        if resp.status_code in (200, 404):
            return resp.status_code, resp.text
        raise TransientError(f"HTTP {resp.status_code}")

    def get_image(self, url: str) -> tuple[int, bytes, str]:
        """(HTTP status, body, content type) for 200 and 404; raises TransientError otherwise."""
        try:
            resp = self.client.get(url)
        except httpx.HTTPError as exc:
            raise TransientError(str(exc)) from exc
        if resp.status_code in (200, 404):
            return resp.status_code, resp.content, resp.headers.get("content-type", "")
        raise TransientError(f"HTTP {resp.status_code}")

    def close(self) -> None:
        self.client.close()
