"""
Convert numeric-tone pinyin to diacritic pinyin.
Example: "ke3 yi3" → "kě yǐ"
         "you2 yong3" → "yóu yǒng"
"""

TONE_MAP: dict[str, list[str]] = {
    'a': ['ā', 'á', 'ǎ', 'à', 'a'],
    'e': ['ē', 'é', 'ě', 'è', 'e'],
    'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
    'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
    'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
    'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
    'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],  # v is sometimes used for ü
}

# Tone placement rules: place on the vowel that takes the tone mark
# Rule: a/e always get the mark; ou → o; otherwise last vowel
VOWELS = 'aeiouüv'


def _place_tone(syllable: str, tone: int) -> str:
    """Place tone mark on the correct vowel in a syllable."""
    if tone == 5:  # neutral tone
        return syllable

    # Rule 1: a or e always takes the mark
    for v in ('a', 'e'):
        if v in syllable:
            return syllable.replace(v, TONE_MAP[v][tone - 1], 1)

    # Rule 2: ou → o gets the mark
    if 'ou' in syllable:
        return syllable.replace('o', TONE_MAP['o'][tone - 1], 1)

    # Rule 3: last vowel gets the mark
    last_vowel_idx = -1
    last_vowel_char = ''
    for idx, ch in enumerate(syllable):
        if ch in VOWELS:
            last_vowel_idx = idx
            last_vowel_char = ch

    if last_vowel_idx >= 0:
        replacement = TONE_MAP[last_vowel_char][tone - 1]
        return syllable[:last_vowel_idx] + replacement + syllable[last_vowel_idx + 1:]

    return syllable


def numeric_to_diacritic(pinyin: str) -> str:
    """
    Convert a full pinyin string (may contain spaces and multiple syllables).
    "ke3 yi3"     → "kě yǐ"
    "you2 yong3"  → "yóu yǒng"
    "zhong1 wen2" → "zhōng wén"
    "r5"          → "r"  (erhua neutral)
    """
    result = []
    for syllable in pinyin.strip().split():
        # Strip brackets if present e.g. [ke3]
        syllable = syllable.strip('[]')

        if syllable and syllable[-1].isdigit():
            tone = int(syllable[-1])
            base = syllable[:-1]
            result.append(_place_tone(base, tone))
        else:
            result.append(syllable)

    return ' '.join(result)
