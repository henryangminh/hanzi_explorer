"""
Extract and parse the useful part of a hvdic /whv/ or /wpy/ page.

Everything about the word is kept: result list (div.info), the character block (info, stroke
animation data, other readings, glyph forms "Tự hình" — image URLs —, variants "Dị thể", similar
characters, poems) and one block per reading (definitions per source dictionary, compound words).
Only page furniture is dropped: ads, scripts, icons, the decorative stroke-grid SVG.
"""
import json
import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup, Tag

SITE = "https://hvdic.thivien.net"


def _text(el: Tag) -> str:
    return re.sub(r"[ \t]+", " ", el.get_text(" ", strip=True)).strip()


def _lines(el: Tag) -> list[str]:
    """Text of an element split on <br>, one entry per line."""
    for br in el.find_all("br"):
        br.replace_with("\n")
    return [re.sub(r"\s+", " ", line).strip() for line in el.get_text().split("\n") if line.strip()]


def _label_values(el: Tag) -> dict[str, str]:
    """'Tổng nét: 7' lines → {'Tổng nét': '7'}."""
    result = {}
    for line in _lines(el):
        label, sep, value = line.partition(":")
        if sep:
            result[label.strip()] = value.strip()
    return result


def _sections(block: Tag) -> list[tuple[str, Tag]]:
    """(title, content) pairs: each p.hvres-source followed by its div.hvres-meaning."""
    pairs = []
    for source in block.select("p.hvres-source"):
        content = source.find_next_sibling()
        if content is not None and "hvres-meaning" in (content.get("class") or []):
            title = re.sub(r"\s*\d+$", "", _text(source))  # "Từ ghép 22" → "Từ ghép"
            pairs.append((title, content))
    return pairs


def extract_content(html: str) -> str | None:
    """Cleaned HTML of the results area, or None when the site has no entry for the word."""
    soup = BeautifulSoup(html, "html.parser")
    blocks = [b for b in soup.select("div.hvres") if "hvres-ads" not in (b.get("class") or [])]
    if not blocks:
        return None
    for block in blocks:
        for el in block.select("svg, script, i.fas, .hvres-operations"):
            el.decompose()
    info = soup.select_one("div.info")
    return "\n".join(str(el) for el in ([info] if info else []) + blocks)


def _compounds(content: Tag) -> list[dict]:
    """'đàm phán 談判 • …' links → [{'reading': 'đàm phán', 'word': '談判'}, …]."""
    items = []
    for a in content.find_all("a"):
        word = (a.get("href") or "").rsplit("/", 1)[-1]
        reading = _text(a).removesuffix(word).strip()
        items.append({"reading": reading, "word": word})
    return items


def _glyph_forms(content: Tag) -> list[dict]:
    """Historical scripts: [{'label': 'Giáp cốt văn', 'url': 'https://…/pic/jgw/….gif'}, …]."""
    forms = []
    for span in content.find_all("span"):
        img = span.find("img")
        src = img and (img.get("data-original") or img.get("src"))
        if src:
            forms.append({"label": span.get("data-tippy-content", ""), "url": urljoin(SITE, src)})
    return forms


def glyph_image_urls(data: dict) -> list[tuple[str, str]]:
    """(url, label) of every glyph image referenced by parsed page data."""
    return [(f["url"], f["label"]) for f in data.get("char", {}).get("glyph_forms", [])]


def _parse_char_block(block: Tag) -> dict:
    info_el = block.select_one("div.hvres-meaning")
    writer = block.select_one("div.hanzi-writer[data-graphics]")
    char = {"info": _label_values(info_el) if info_el else {}}
    if writer:
        char["stroke_graphics"] = json.loads(writer["data-graphics"])  # hanzi-writer strokes + medians
    for title, content in _sections(block):
        if title == "Tự hình":
            char["glyph_forms"] = _glyph_forms(content)
        elif title == "Dị thể":
            char["variants"] = [_text(v) for v in content.select("span.hvres-variant")]
        elif title == "Âm đọc khác":
            char["other_readings"] = _label_values(content)
        elif title == "Chữ gần giống":
            char["similar_chars"] = [_text(v) for v in content.select("span.hvres-variant")]  # skips the font help link
        elif title == "Một số bài thơ có sử dụng":
            char["poems"] = [p.strip() for p in _text(content).split("•") if p.strip()]
    return char


def _parse_reading_block(block: Tag) -> dict:
    spell = block.select_one(".hvres-spell")
    script = block.select_one(".hvres-definition .hvres-info")
    entry = {"reading": _text(spell) if spell else "", "script": _text(script) if script else "", "definitions": []}
    for title, content in _sections(block):
        if title == "Từ ghép":
            entry["compounds"] = _compounds(content)
        else:
            entry["definitions"].append({"source": title, "lines": _lines(content)})
    return entry


def parse(content_html: str) -> dict:
    """Structured data from cleaned content (extract_content)."""
    soup = BeautifulSoup(content_html, "html.parser")
    info = soup.select_one("div.info .hvres-goto-link")
    result: dict = {
        "results": [_text(r) for r in soup.select("div.info .hvres-goto-link")] if info else [],
        "entries": [],
    }
    for block in soup.select("div.hvres"):
        if "han-word" in (block.get("class") or []):
            result["char"] = _parse_char_block(block)
        else:
            result["entries"].append(_parse_reading_block(block))
    return result
