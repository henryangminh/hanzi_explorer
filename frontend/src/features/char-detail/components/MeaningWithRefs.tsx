import { Fragment } from 'react'

// "see 汉字[pinyin]" / "xem 汉字[pinyin]", optionally "traditional|simplified[pinyin]"
const SEE_PATTERN = /((see|xem)\s+)([一-鿿㐀-䶿豈-﫿]+(?:\|[一-鿿㐀-䶿豈-﫿]+)?(?:\[[^\]]*\])?)/g

/** The word to look up for a reference: the simplified form after "|" if present, without the [pinyin]. */
function referencedWord(ref: string): string {
  const pipeIdx = ref.indexOf('|')
  const bracketIdx = ref.indexOf('[')
  const start = pipeIdx !== -1 ? pipeIdx + 1 : 0
  return bracketIdx !== -1 ? ref.slice(start, bracketIdx) : ref.slice(start)
}

/** A meaning whose "see …" cross-references are clickable when `onWordClick` is given. */
export function MeaningWithRefs({ text, onWordClick }: { text: string; onWordClick?: (word: string) => void }) {
  if (!onWordClick) return <>{text}</>

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0
  for (const match of text.matchAll(SEE_PATTERN)) {
    const index = match.index ?? 0
    if (index > lastIndex) parts.push(<Fragment key={key++}>{text.slice(lastIndex, index)}</Fragment>)
    const ref = match[3]
    const word = referencedWord(ref)
    parts.push(<Fragment key={key++}>{match[1]}</Fragment>)
    parts.push(
      <span
        key={key++}
        role="button"
        tabIndex={0}
        onClick={() => onWordClick(word)}
        onKeyDown={(e) => e.key === 'Enter' && onWordClick(word)}
        className="cursor-pointer hover:opacity-70 transition-opacity font-cjk"
      >
        {ref}
      </span>,
    )
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) parts.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>)
  return <>{parts}</>
}
