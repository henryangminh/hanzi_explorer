import type { ReaderToken } from '@/types'
import { ReaderWord } from './ReaderWord'

interface Props {
  tokens: ReaderToken[]
  showPinyin: boolean
  selected: number | null
  onSelect: (index: number) => void
}

/** The analysed text: words are clickable, everything else (punctuation, Latin text) is plain. */
export function ReadingText({ tokens, showPinyin, selected, onSelect }: Props) {
  return (
    <div className="font-cjk text-2xl leading-[2.4] whitespace-pre-wrap break-words text-[var(--color-text)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3">
      {tokens.map((token, i) =>
        token.word ? (
          <ReaderWord key={i} token={token} showPinyin={showPinyin} selected={selected === i} onClick={() => onSelect(i)} />
        ) : (
          <span key={i}>{token.text}</span>
        ),
      )}
    </div>
  )
}
