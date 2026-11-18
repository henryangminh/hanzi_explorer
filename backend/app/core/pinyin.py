"""
Convert between numeric-tone pinyin and diacritic pinyin.
Example: "ke3 yi3" ↔ "kě yǐ"
         "you2 yong3" ↔ "yóu yǒng"
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


# tone-marked vowel → (vowel, tone)
_MARKED: dict[str, tuple[str, int]] = {
    mark: (vowel, tone + 1)
    for vowel, marks in TONE_MAP.items() if vowel != 'v'
    for tone, mark in enumerate(marks[:4])
}


def diacritic_to_numeric(text: str) -> str:
    """
    Replace tone marks with a tone number at the end of each marked syllable (lowercase input).
    "nǐhǎo"    → "ni3hao3"
    "zhōngguó" → "zhong1guo2"
    "lǜ"       → "lü4"
    Unmarked syllables are left as they are.
    """
    out: list[str] = []
    i, n = 0, len(text)
    while i < n:
        ch = text[i]
        i += 1
        if ch not in _MARKED:
            out.append(ch)
            continue
        vowel, tone = _MARKED[ch]
        # "r" ends a syllable only in ér / ěr / èr (erhua like huār is a syllable of its own: hua1 r5)
        prev = text[i - 2] if i >= 2 else ''
        starts_syllable = not (prev.isalpha() and prev not in VOWELS and prev not in _MARKED)
        finals = ('ng', 'n', 'r') if vowel == 'e' and starts_syllable else ('ng', 'n')
        out.append(vowel)
        # Rest of the syllable: the following vowels, then a final n / ng (/ r) unless it starts the next syllable
        while i < n and text[i] in VOWELS:
            out.append(text[i])
            i += 1
        for final in finals:
            end = i + len(final)
            if text.startswith(final, i) and (end == n or (text[end] not in VOWELS and text[end] not in _MARKED)):
                out.append(final)
                i = end
                break
        out.append(str(tone))
    return ''.join(out)
