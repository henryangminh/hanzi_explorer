import { cn } from '@/lib/cn'
import { statusClass } from '@/lib/flashcardStatus'
import type { FlashcardEntry } from '@/types'
import { FlashcardMeanings } from './FlashcardMeanings'
import { FlashcardReading } from './FlashcardReading'

/** Font size of the word, shrinking for long words so they fit the card width. */
function wordFontSize(word: string): string {
  if (word.length >= 4) return 'clamp(2.5rem, 22.5cqw, 4.25rem)'
  if (word.length === 3) return 'clamp(3rem, 28cqw, 5.5rem)'
  return 'clamp(3.5rem, 12cqh, 7rem)'
}

interface LargeCardFaceProps {
  card: FlashcardEntry
  revealed: boolean
  hiding: boolean
  onWordClick: () => void
}

/** The full-screen card: word on top (40%), reading + meanings below (60%) once revealed. */
export function LargeCardFace({ card, revealed, hiding, onWordClick }: LargeCardFaceProps) {
  return (
    <div
      className={cn(
        '@container flex flex-col border border-[var(--color-border-md)] rounded-2xl shadow-2xl w-full h-full overflow-hidden',
        statusClass(card.status) ?? 'bg-[var(--color-bg)] transition-colors duration-[450ms]',
      )}
    >
      <div className="flex flex-col items-center justify-center px-6 gap-2 py-4 min-h-0" style={{ flex: 2 }}>
        <div
          className="font-cjk font-bold text-[var(--color-text)] leading-none select-none cursor-pointer hover:text-[var(--color-primary)] transition-colors text-center"
          style={{ fontSize: wordFontSize(card.char), wordBreak: 'keep-all' }}
          onClick={onWordClick}
        >
          {card.char}
        </div>
        {revealed && <FlashcardReading card={card} hiding={hiding} pinyinClass="text-xl" sinoVnClass="text-base" />}
      </div>

      {revealed && (
        <div className={cn('flex flex-col overflow-hidden', hiding ? 'fc-hide' : 'fc-reveal')} style={{ flex: 3 }}>
          <div className="fc-divider mx-4 border-t border-[var(--color-border)]" />
          <div className="flex-1 px-6 py-5 flex flex-col gap-3 overflow-y-auto">
            <FlashcardMeanings card={card} textClass="text-lg" />
          </div>
        </div>
      )}
    </div>
  )
}
