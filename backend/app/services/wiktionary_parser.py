"""
Parse Wiktionary responses into clean, readable structures.

EN: uses REST API response (JSON with partOfSpeech + definitions)
VI: uses MediaWiki revisions API (raw wikitext, text/x-wiki format)
"""
import re
from typing import Any


# ── EN Wiktionary (REST API JSON) ────────────────────────

def _strip_html(text: str) -> str:
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&quot;', '"')
    text = text.replace('&amp;', '&')
    text = text.replace('&#39;', "'")
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r' {2,}', ' ', text)
    text = re.sub(r'\s*—\s*', ' — ', text)
    return text.strip()


def parse_wiktionary(data: dict[str, Any], lang_code: str) -> dict[str, Any]:
    """Parse EN Wiktionary REST API response."""
    if 'error' in data:
        return {'found': False, 'error': str(data['error'])}

    chinese_keys = ['zh', 'cmn', 'yue', 'lzh']
    sections_raw = None
    for key in chinese_keys:
        if key in data:
            sections_raw = data[key]
            break

    if not sections_raw:
        return {'found': False, 'error': 'No Chinese entry found'}

    sections = []
    for section in sections_raw:
        pos = section.get('partOfSpeech', '')
        raw_defs = section.get('definitions', [])
        defs = []
        for d in raw_defs:
            definition = _strip_html(d.get('definition', ''))
            if definition:
                defs.append(definition)
            for ex in d.get('parsedExamples', []):
                example = _strip_html(ex.get('example', ''))
                if example:
                    defs.append(f'→ {example}')
        if defs:
            sections.append({'part_of_speech': pos, 'definitions': defs})

    if not sections:
        return {'found': False, 'error': 'No definitions found'}

    return {'found': True, 'sections': sections}


# ── VI Wiktionary (wikitext parser) ──────────────────────

_SECTION_MAP = {
    'verb': 'Động từ',
    'noun': 'Danh từ',
    'adj': 'Tính từ',
    'adv': 'Trạng từ',
    'pron': 'Đại từ',
    'particle': 'Trợ từ',
    'classifier': 'Lượng từ',
    'interjection': 'Thán từ',
    'prep': 'Giới từ',
    'conj': 'Liên từ',
    'pn': 'Danh từ riêng',
    'phrase': 'Cụm từ',
}


def _strip_wiki(text: str) -> str:
    """Remove wikitext markup, keep readable text."""
    # [[link|display]] → display, [[link]] → link
    text = re.sub(r'\[\[(?:[^|\]]+\|)?([^\]]+)\]\]', r'\1', text)
    # '''bold''' and ''italic''
    text = re.sub(r"'''(.+?)'''", r'\1', text)
    text = re.sub(r"''(.+?)''", r'\1', text)
    # {{template|...}} → remove entirely
    text = re.sub(r'\{\{[^}]+\}\}', '', text)
    # clean up extra whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def parse_vi_wikitext(wikitext: str) -> dict[str, Any]:
    """
    Parse Vietnamese Wiktionary wikitext for Chinese entries.
    Handles sections like {{-verb-}}, definition lines (# ...) and
    example lines (#: ...).
    """
    lines = wikitext.splitlines()
    sections: list[dict] = []
    current_pos: str | None = None
    current_defs: list[str] = []

    def flush():
        if current_pos is not None and current_defs:
            sections.append({
                'part_of_speech': current_pos,
                'definitions': current_defs[:],
            })

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Section header: {{-verb-}}, {{-noun-}} etc.
        m = re.match(r'\{\{-(\w+)-\}\}', line)
        if m:
            flush()
            current_defs = []
            key = m.group(1).lower()
            current_pos = _SECTION_MAP.get(key, key.capitalize())
            continue

        # Example line: #: or ##:
        if re.match(r'^#+:', line):
            text = re.sub(r'^#+:\s*', '', line)
            cleaned = _strip_wiki(text)
            if cleaned and current_defs:
                current_defs.append(f'→ {cleaned}')
            continue

        # Definition line: # (not #:)
        if re.match(r'^#+[^:]', line):
            text = re.sub(r'^#+\s*', '', line)
            cleaned = _strip_wiki(text)
            if cleaned:
                current_defs.append(cleaned)
            continue

    flush()

    if not sections:
        return {'found': False, 'error': 'No definitions found'}

    return {'found': True, 'sections': sections}
