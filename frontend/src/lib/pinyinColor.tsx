// Tone colors — light mode
const TONE_COLORS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '#1a70b8', // ā ē ī — xanh dương (bằng)
  2: '#0d9363', // á é í — emerald   (sắc)
  3: '#7c3aed', // ǎ ě ǐ — tím       (hỏi)
  4: '#c8282a', // à è ì — đỏ đậm   (nặng)
  5: '#52525b', // a e i  — xám      (khinh thanh)
}

function getTone(syllable: string): 1 | 2 | 3 | 4 | 5 {
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
function splitSyllables(pinyin: string, n?: number): string[] {
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

interface ColorizedPinyinProps {
  pinyin: string
  /** Number of hanzi chars — enables per-syllable splitting for no-space xdhy format */
  n?: number
  className?: string
}

/**
 * Renders a pinyin string with each syllable colored by tone.
 * Handles spaces (multi-syllable cedict) and // (separable words).
 * When n is provided and pinyin has no spaces, uses syllable DP splitting (xdhy format).
 */
export function ColorizedPinyin({ pinyin, n, className }: ColorizedPinyinProps) {
  if (n !== undefined && n > 1) {
    const syllables = splitSyllables(pinyin, n)
    return (
      <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
        {syllables.map((syl, i) => (
          <span key={i} style={{ color: TONE_COLORS[getTone(syl)] }}>{syl}</span>
        ))}
      </span>
    )
  }

  // Space/slash-separated format: split while keeping delimiters for display
  const parts = pinyin.split(/(\s+|\/\/)/)
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (/^\s+$/.test(part) || part === '//') {
          return <span key={i}>{part}</span>
        }
        return (
          <span key={i} style={{ color: TONE_COLORS[getTone(part)] }}>
            {part}
          </span>
        )
      })}
    </span>
  )
}

interface ColorizedHanziProps {
  char: string    // hanzi string, e.g. "爱国" or "我"
  pinyin: string  // corresponding pinyin, e.g. "ài guó" or "wǒ" or "àiguó"
  className?: string
}

/**
 * Renders each hanzi character colored by the tone of its corresponding pinyin syllable.
 * Handles both space-separated (cedict) and no-space tone-marked (xdhy) formats.
 * Falls back to tone-5 gray if syllable count doesn't match char count.
 */
export function ColorizedHanzi({ char, pinyin, className }: ColorizedHanziProps) {
  const chars = [...char]
  const syllables = splitSyllables(pinyin, chars.length)

  return (
    <span className={className}>
      {chars.map((c, i) => {
        const tone = syllables[i] ? getTone(syllables[i]) : 5
        return (
          <span key={i} style={{ color: TONE_COLORS[tone] }}>
            {c}
          </span>
        )
      })}
    </span>
  )
}
