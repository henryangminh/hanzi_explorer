import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, X as CloseIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toggleStatus } from '@/lib/flashcardStatus'
import { useCardCarousel } from '@/hooks/useCardCarousel'
import { useGoToDictionary } from '@/hooks/useGoToDictionary'
import { useRevealToggle } from '@/hooks/useRevealToggle'
import { useSwipe } from '@/hooks/useSwipe'
import { FlashcardStatusButtons, RevealButton } from '@/components/ui/FlashcardStatusButtons'
import type { FlashcardEntry, FlashcardStatus } from '@/types'
import { useFlashcardKeys } from '../hooks/useFlashcardKeys'
import { LargeCardFace } from './LargeCardFace'
import { WotdDatePicker } from './WotdDatePicker'

const CLOSE_ANIMATION_MS = 200

export interface WotdNavigation {
  wotdDates: Set<string>
  studiedDates?: Set<string>
  viewDate: string | null
  onSelectDate: (date: string) => void
  onBackToToday: () => void
}

export interface FlashcardLargeProps {
  cards: FlashcardEntry[]
  initialIndex?: number
  onClose: () => void
  onStatusChange?: (char: string, status: FlashcardStatus | null) => void
  /** Only for the "words of the day" widget: browse past days. */
  wotd?: WotdNavigation
}

const NAV_BUTTON = 'p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors'

/** Full-screen flashcard viewer with keyboard, swipe and button navigation. */
export function FlashcardLarge({ cards, initialIndex = 0, onClose, onStatusChange, wotd }: FlashcardLargeProps) {
  const { t } = useTranslation()
  const goToDictionary = useGoToDictionary()
  const reveal = useRevealToggle()
  const total = cards.length
  const carousel = useCardCarousel(total, initialIndex, true)
  const card = total > 0 ? cards[carousel.safeIndex] : null
  const [isClosing, setIsClosing] = useState(false)

  const navigate = (dir: 'next' | 'prev') => carousel.go(dir, reveal.reset)
  const swipe = useSwipe(navigate)

  function close() {
    if (isClosing) return
    setIsClosing(true)
    setTimeout(onClose, CLOSE_ANIMATION_MS)
  }

  function mark(clicked: FlashcardStatus) {
    if (card) onStatusChange?.(card.char, toggleStatus(card.status, clicked))
  }

  useFlashcardKeys({
    onPrev: () => navigate('prev'),
    onNext: () => navigate('next'),
    onLearned: () => mark('learned'),
    onNotLearned: () => mark('not_learned'),
    onToggleReveal: reveal.toggle,
    onClose: close,
  })

  return (
    <div className={cn('fixed inset-0 z-30 flex flex-col pt-14 pb-4 bg-[var(--color-bg)]/96 backdrop-blur-md', isClosing ? 'fc-large-overlay-exit' : 'fc-large-overlay-enter')}>
      {/* Top row (h-12) — counter is vertically centered between the navbar and the card. */}
      <div className="flex-none h-12 flex items-center px-4">
        <button
          type="button"
          onClick={close}
          title={t('common.back')}
          className="sm:hidden p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <p className="flex-1 text-center text-sm text-[var(--color-text-muted)]">
          {total > 0 ? `${carousel.safeIndex + 1} / ${total}` : '—'}
        </p>
        <div className="sm:hidden w-9" />
      </div>

      {/* Card row: [prev] [card] [next] grouped so the arrows sit beside the card edges. */}
      <div className="flex-1 flex items-center justify-center min-h-0" {...swipe}>
        <div className="flex items-center gap-3 h-full">
          <button type="button" onClick={() => navigate('prev')} className={cn('flex-none', NAV_BUTTON)}>
            <ChevronLeft size={28} />
          </button>

          <div className="h-full aspect-[3/5]">
            {card ? (
              <div
                key={carousel.enterKey}
                className={cn('h-full', carousel.entering && 'fc-large-card-enter', carousel.exitClass)}
                onAnimationEnd={carousel.onAnimationEnd}
              >
                <LargeCardFace
                  card={card}
                  revealed={reveal.shown}
                  hiding={reveal.hiding}
                  onWordClick={() => goToDictionary(card.char)}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] italic text-sm">
                {t('dashboard.noCards')}
              </div>
            )}
          </div>

          {/* Right column: close (aligned with the counter row) + next (centered) */}
          <div className="flex-none h-full relative flex flex-col items-center">
            <div className="absolute -top-12 h-12 items-center justify-center hidden sm:flex">
              <button
                type="button"
                onClick={close}
                title={t('common.close')}
                className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
              >
                <CloseIcon size={18} />
              </button>
            </div>
            <div className="flex-1 flex items-center">
              <button type="button" onClick={() => navigate('next')} className={NAV_BUTTON}>
                <ChevronRight size={28} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-none flex items-center justify-center gap-6 pt-3">
        <RevealButton shown={reveal.shown} size="xl" onClick={reveal.toggle} />
        <FlashcardStatusButtons status={card?.status} size="xl" onClick={mark} />
      </div>

      {wotd && (
        <div className="flex-none flex flex-col items-center pt-2">
          <div className="w-[180px]">
            <WotdDatePicker {...wotd} rowPaddingClass="px-1" />
          </div>
        </div>
      )}

      <p className="flex-none text-center text-[10px] text-[var(--color-text-muted)] opacity-40 select-none pt-1">
        ← → {t('flashcardLarge.hintNav')} · ↑ ✓ · ↓ ✗ · Space ? · Esc {t('flashcardLarge.hintClose')}
      </p>
    </div>
  )
}
