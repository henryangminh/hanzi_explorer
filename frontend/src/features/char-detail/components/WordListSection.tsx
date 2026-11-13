import { ColorizedHanzi, ColorizedPinyin } from '@/lib/pinyinColor'
import type { WordInfo } from '@/types'
import { CollapsibleSection } from './CollapsibleSection'

/** Numbered, clickable list of related words (synonyms / antonyms). */
export function WordListSection({ title, words, onWordClick }: {
  title: string
  words: WordInfo[]
  onWordClick?: (word: string) => void
}) {
  if (!words?.length) return null
  return (
    <CollapsibleSection title={title}>
      <div className="pl-4 flex flex-col gap-1">
        {words.map((w, i) => (
          <button
            key={w.word}
            type="button"
            onClick={() => onWordClick?.(w.word)}
            className="flex items-baseline gap-3 text-left cursor-pointer hover:opacity-70 transition-opacity w-fit"
          >
            <span className="text-sm text-[var(--color-text-muted)] shrink-0 w-5 text-right">{i + 1}.</span>
            {w.pinyin
              ? <ColorizedHanzi char={w.word} pinyin={w.pinyin} className="font-cjk text-lg" />
              : <span className="font-cjk text-lg text-[var(--color-text)]">{w.word}</span>}
            {w.pinyin && <ColorizedPinyin pinyin={w.pinyin} className="text-sm" />}
            {w.hanviet && <span className="text-sm text-[var(--color-primary)]">{w.hanviet}</span>}
          </button>
        ))}
      </div>
    </CollapsibleSection>
  )
}
