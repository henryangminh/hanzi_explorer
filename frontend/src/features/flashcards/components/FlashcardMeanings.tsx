import { cn } from '@/lib/cn'
import type { FlashcardEntry } from '@/types'

/** English and Vietnamese brief meanings of a card, or a dash when there are none. */
export function FlashcardMeanings({ card, textClass }: { card: FlashcardEntry; textClass: string }) {
  if (!card.cedict_brief && !card.cvdict_brief) {
    return <p className={cn(textClass, 'text-[var(--color-text-muted)] italic')}>—</p>
  }
  return (
    <>
      {card.cedict_brief && (
        <p className={cn(textClass, 'text-[var(--color-text)] leading-snug')}>{card.cedict_brief}</p>
      )}
      {card.cvdict_brief && (
        <p className={cn(textClass, 'text-[var(--color-text-muted)] leading-snug')}>{card.cvdict_brief}</p>
      )}
    </>
  )
}
