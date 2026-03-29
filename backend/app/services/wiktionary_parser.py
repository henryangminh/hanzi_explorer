"""
Parse Wiktionary REST API response into clean readable structure.
"""
import re
from typing import Any


def _strip_html(text: str) -> str:
    """Remove HTML tags and decode HTML entities."""
    # Decode entities first
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&quot;', '"')
    text = text.replace('&amp;', '&')
    text = text.replace('&#39;', "'")
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    # Strip tags
    text = re.sub(r'<[^>]+>', '', text)
    # Collapse multiple spaces
    text = re.sub(r' {2,}', ' ', text)
    # Clean up arrow examples — trim leading/trailing whitespace per segment
    text = re.sub(r'\s*—\s*', ' — ', text)
    return text.strip()


def parse_wiktionary(data: dict[str, Any], lang_code: str) -> dict[str, Any]:
    """
    Returns cleaned structure:
    {
        "found": True/False,
        "error": "...",          # only when found=False
        "sections": [
            {
                "part_of_speech": "Verb",
                "definitions": ["can; may", "able to"]
            }
        ]
    }
    """
    if 'error' in data:
        return {'found': False, 'error': str(data['error'])}

    # Keys Wiktionary uses for Chinese content
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

            # Examples
            for ex in d.get('parsedExamples', []):
                example = _strip_html(ex.get('example', ''))
                if example:
                    defs.append(f'→ {example}')

        if defs:
            sections.append({'part_of_speech': pos, 'definitions': defs})

    if not sections:
        return {'found': False, 'error': 'No definitions found'}

    return {'found': True, 'sections': sections}
