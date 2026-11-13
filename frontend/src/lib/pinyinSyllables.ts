/** Tone 1–4 from the tone mark, 5 (neutral) when there is none. */
export function getTone(syllable: string): 1 | 2 | 3 | 4 | 5 {
  if (/[āēīōūǖ]/.test(syllable)) return 1
  if (/[áéíóúǘ]/.test(syllable)) return 2
  if (/[ǎěǐǒǔǚ]/.test(syllable)) return 3
  if (/[àèìòùǜ]/.test(syllable)) return 4
  return 5
}

// ── Syllable splitter for no-space tone-marked pinyin (xdhy format) ──────────

// Maps tone-marked vowels + bare ü → ASCII base (ü → v for matching)
const DIACRITICS: Record<string, string> = {
  'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
  'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
  'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
  'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
  'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
  'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v',
  'ü': 'v',
}

function deaccent(s: string): string {
  // Normalize to NFC first so precomposed é/à/etc. match our map
  return [...s.normalize('NFC')].map(c => DIACRITICS[c] ?? c).join('')
}

// Initials — 2-char variants first so greedy matching prefers them
const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w']

// Finals in normalized form (v = ü), longest first for greedy matching
const FINALS = [
  'iang', 'iong', 'uang', 'ueng',
  'iao', 'ian', 'ing', 'ang', 'eng', 'ong', 'uai', 'uan', 'uei', 'uen', 'van',
  'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ia', 'ie', 'iu', 'in', 'ua', 'uo', 'ui', 'un', 'er', 've', 'vn',
  'a', 'o', 'e', 'i', 'u', 'v',
]

function splitPinyinToN(pinyin: string, n: number): string[] {
  if (n <= 1) return [pinyin]

  let purePinyin = ''
  const charMap: number[] = []
  const normFull = deaccent(pinyin)

  for (let i = 0; i < normFull.length; i++) {
    if (/[a-z]/i.test(normFull[i])) {
      purePinyin += normFull[i].toLowerCase()
      charMap.push(i)
    }
  }

  const len = purePinyin.length

  function solve(pos: number, rem: number): number[] | null {
    if (pos === len && rem === 0) return []
    if (pos >= len || rem === 0) return null
    for (const init of [...INITIALS, '']) {
      if (init && !purePinyin.startsWith(init, pos)) continue
      const fp = pos + init.length
      if (fp > len) continue
      for (const fin of FINALS) {
        if (!purePinyin.startsWith(fin, fp)) continue
        const end = fp + fin.length
        const rest = solve(end, rem - 1)
        if (rest !== null) return [end, ...rest]
      }
    }
    return null
  }

  const pureEnds = solve(0, n)
  if (!pureEnds || pureEnds.length !== n) return [pinyin]

  const result: string[] = []
  let prevOrig = 0
  for (let i = 0; i < n; i++) {
    const pureEnd = pureEnds[i]
    let origEnd = pinyin.length
    if (i < n - 1) {
      origEnd = charMap[pureEnd]
    }
    result.push(pinyin.slice(prevOrig, origEnd))
    prevOrig = origEnd
  }
  return result
}

/**
 * Split a pinyin string into individual syllables.
 * - Space/slash-separated (cedict/cvdict): split on whitespace and //.
 * - No-space tone-marked (xdhy): use syllable DP with char count hint n.
 */
export function splitSyllables(pinyin: string, n?: number): string[] {
  if (n !== undefined && n > 1) {
    const spaceParts = pinyin.split(/\s+|\/\//).filter(Boolean)
    if (spaceParts.length === n) return spaceParts
    return splitPinyinToN(pinyin, n)
  }
  if (/[\s/]/.test(pinyin)) {
    return pinyin.split(/\s+|\/\//).filter(Boolean)
  }
  return [pinyin]
}
