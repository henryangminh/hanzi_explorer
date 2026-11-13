import { formatUmlaut } from './pinyin'
import { getTone, splitSyllables } from './pinyinSyllables'

// Tone colors via CSS variables — light/dark handled in globals.css
const TONE_COLORS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'var(--tone-1)', // bằng
  2: 'var(--tone-2)', // sắc
  3: 'var(--tone-3)', // hỏi
  4: 'var(--tone-4)', // nặng
  5: 'var(--tone-5)', // khinh thanh
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
  const p = formatUmlaut(pinyin)
  if (n !== undefined && n > 1) {
    if (p.includes('//')) {
      const groups = p.split('//')
      return (
        <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
          {groups.map((group, gi) => {
            const syls = group.split(/\s+/).filter(Boolean)
            const toRender = syls.length > 0 ? syls : [group]
            return (
              <span key={gi}>
                {gi > 0 && <span>//</span>}
                {toRender.map((syl, i) => (
                  <span key={i} style={{ color: TONE_COLORS[getTone(syl)] }}>{syl}</span>
                ))}
              </span>
            )
          })}
        </span>
      )
    }
    const syllables = splitSyllables(p, n)
    return (
      <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
        {syllables.map((syl, i) => (
          <span key={i} style={{ color: TONE_COLORS[getTone(syl)] }}>{syl}</span>
        ))}
      </span>
    )
  }

  // Space/slash-separated format: split while keeping delimiters for display
  const parts = p.split(/(\s+|\/\/)/)
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
  const p = formatUmlaut(pinyin)
  const syllables = splitSyllables(p, chars.length)

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
