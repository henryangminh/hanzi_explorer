import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useSwipe } from '@/hooks/useSwipe'
import type { useCardCarousel } from '@/hooks/useCardCarousel'
import type { FlashcardEntry, FlashcardStatus } from '@/types'
import { Flashcard } from '@/features/flashcards/components/Flashcard'

const ARROW = 'p-0.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors flex-shrink-0'

/** Decorative cards peeking out behind the current one when there are more cards. */
function StackShadow({ total }: { total: number }) {
  const layer = 'absolute inset-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)]'
  return (
    <>
      {total > 2 && <div aria-hidden className={layer} style={{ transform: 'translateY(10px)', zIndex: 0 }} />}
      {total > 1 && <div aria-hidden className={layer} style={{ transform: 'translateY(5px)', zIndex: 1 }} />}
    </>
  )
}

interface CardStackProps {
  cards: FlashcardEntry[]
  carousel: ReturnType<typeof useCardCarousel>
  onStatusChange: (char: string, status: FlashcardStatus | null) => void
}

/** The widget's carousel: one card on top of a stack, with arrows and swipe. */
export function CardStack({ cards, carousel, onStatusChange }: CardStackProps) {
  const { t } = useTranslation()
  const swipe = useSwipe(carousel.go)
  const card = cards[carousel.safeIndex]
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" onClick={() => carousel.go('prev')} aria-label={t('common.previous')} className={ARROW}>
        <ChevronLeft size={20} />
      </button>

      <div className="flex-1 min-w-0 [touch-action:pan-y]" {...swipe}>
        <div className="relative" style={{ perspective: '1000px' }}>
          <StackShadow total={cards.length} />
          <div
            key={carousel.enterKey}
            className={cn(carousel.entering && 'fc-enter', carousel.exitClass)}
            onAnimationEnd={carousel.onAnimationEnd}
            style={{ position: 'relative', zIndex: 2 }}
          >
            <Flashcard card={card} onStatusChange={(s) => onStatusChange(card.char, s)} />
          </div>
        </div>
      </div>

      <button type="button" onClick={() => carousel.go('next')} aria-label={t('common.next')} className={ARROW}>
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
