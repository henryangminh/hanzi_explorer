"""
Utilities for cleaning CC-CEDICT meaning strings.

CC-CEDICT uses special syntax inside meanings:
  - 以[yi3]        → cross-reference: char + numeric pinyin
  - [yi3]          → standalone pinyin reference  
  - Yi3 se4 lie4   → numeric pinyin inline (capitalized)
  - CL:個|个[ge4]  → classifier notation
"""
import re
from app.core.pinyin import numeric_to_diacritic


# Match patterns like 以[yi3], 色列[se4 lie4], 漢字[han4 zi4]
_REF_PATTERN = re.compile(r'([^\[\]]*)\[([a-zA-ZüÜ0-9 ]+)\]')

# Match standalone numeric pinyin words like Yi3, Se4, Lie4
_NUMERIC_PINYIN_WORD = re.compile(r'\b([A-Za-z]+[1-5])\b')


def _replace_ref(m: re.Match) -> str:
    char_part = m.group(1)   # e.g. "以" or "CL:個|个" or ""
    pinyin_num = m.group(2)  # e.g. "yi3" or "han4 zi4"
    pinyin_dia = numeric_to_diacritic(pinyin_num)

    if char_part:
        # Keep the char, add diacritic pinyin in parens
        return f'{char_part} ({pinyin_dia})'
    else:
        # Standalone [yi3] → just pinyin
        return f'({pinyin_dia})'


def clean_meaning(meaning: str) -> str:
    """
    Convert CC-CEDICT meaning string to human-readable form.

    Examples:
      'old variant of 以[yi3]'           → 'old variant of 以 (yǐ)'
      'abbr. for Israel 以色列[Yi3 se4 lie4]' → 'abbr. for Israel 以色列 (Yǐ sè liè)'
      'CL:個|个[ge4],張|张[zhang1]'      → 'CL:個|个 (gè),張|张 (zhāng)'
    """
    # Replace all [pinyin] references
    result = _REF_PATTERN.sub(_replace_ref, meaning)

    # Clean up any remaining bare numeric pinyin words (Yi3, Se4 etc.)
    def replace_numeric_word(m: re.Match) -> str:
        word = m.group(1)
        converted = numeric_to_diacritic(word)
        # Only replace if conversion actually changed something (i.e. had a tone number)
        return converted if converted != word else word

    result = _NUMERIC_PINYIN_WORD.sub(replace_numeric_word, result)

    return result.strip()
