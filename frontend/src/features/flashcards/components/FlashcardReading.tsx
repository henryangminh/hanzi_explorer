import { cn } from '@/lib/cn'
import { formatUmlaut } from '@/lib/pinyin'
import type { FlashcardEntry } from '@/types'

interface FlashcardReadingProps {
  card: FlashcardEntry
  hiding: boolean
  pinyinClass: string
  sinoVnClass: string
}

/** Every reading of the card, one per line: pinyin · Hán Việt (shown once the card is revealed). */
export function FlashcardReading({ card, hiding, pinyinClass, sinoVnClass }: FlashcardReadingProps) {
  return (
    <div className={cn('flex flex-col items-center gap-0.5', hiding && 'fc-hide')}>
      {card.readings.map((reading) => (
        <p key={reading.pinyin} className="flex items-baseline gap-1.5 font-medium tracking-wide">
          <span className={cn('text-[var(--color-primary)]', pinyinClass)}>{formatUmlaut(reading.pinyin)}</span>
          {reading.sino_vn && <span className={cn('text-[var(--color-text-muted)]', sinoVnClass)}>{reading.sino_vn}</span>}
        </p>
      ))}
    </div>
  )
}
