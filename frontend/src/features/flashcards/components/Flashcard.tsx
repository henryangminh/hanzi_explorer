import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Expand } from 'lucide-react'
import { cn } from '@/lib/cn'
import { STATUS_RIPPLE_COLOR, statusClass, toggleStatus } from '@/lib/flashcardStatus'
import { useGoToDictionary } from '@/hooks/useGoToDictionary'
import { useRevealToggle } from '@/hooks/useRevealToggle'
import { useRipple } from '@/hooks/useRipple'
import { Ripple } from '@/components/ui/Ripple'
import { FlashcardStatusButtons, RevealButton } from '@/components/ui/FlashcardStatusButtons'
import type { FlashcardEntry, FlashcardStatus } from '@/types'
import { FlashcardMeanings } from './FlashcardMeanings'
import { FlashcardReading } from './FlashcardReading'

interface FlashcardProps {
  card: FlashcardEntry
  onStatusChange?: (status: FlashcardStatus | null) => void
  onExpand?: () => void
  compact?: boolean
}

/** A single study card: the word, a "?" to reveal reading + meaning, and learned / not-learned buttons. */
export function Flashcard({ card, onStatusChange, onExpand, compact = false }: FlashcardProps) {
  const { t } = useTranslation()
  const goToDictionary = useGoToDictionary()
  const cardRef = useRef<HTMLDivElement>(null)
  const { ripple, trigger } = useRipple()
  const reveal = useRevealToggle()

  function handleStatus(clicked: FlashcardStatus, e: React.MouseEvent) {
    e.stopPropagation()
    trigger(e, cardRef.current, STATUS_RIPPLE_COLOR[clicked])
    onStatusChange?.(toggleStatus(card.status, clicked))
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative flex flex-col border border-[var(--color-border-md)] rounded-xl shadow w-full overflow-hidden',
        'aspect-[3/5]',
        statusClass(card.status) ?? 'bg-[var(--color-bg)] transition-colors duration-[450ms]',
      )}
    >
      <Ripple ripple={ripple} />

      {onExpand && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onExpand() }}
          className="absolute top-2 right-2 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors z-10"
          title={t('common.expand')}
        >
          <Expand size={compact ? 12 : 14} />
        </button>
      )}

      {/* Character + reading */}
      <div className={cn('flex-1 flex flex-col items-center justify-center px-4 gap-1', compact ? 'pt-4 pb-2' : 'pt-6 pb-3')}>
        <span
          className={cn('font-cjk font-bold text-[var(--color-text)] leading-none select-none cursor-pointer hover:text-[var(--color-primary)] transition-colors', compact ? 'text-4xl' : 'text-5xl')}
          onClick={() => goToDictionary(card.char)}
        >
          {card.char}
        </span>
        {reveal.shown && (
          <FlashcardReading card={card} hiding={reveal.hiding} pinyinClass="text-xs" sinoVnClass="text-xs" />
        )}
      </div>

      {reveal.shown && (
        <div className={reveal.hiding ? 'fc-hide' : 'fc-reveal'}>
          <div className="fc-divider mx-3 border-t border-[var(--color-border)]" />
          <div className={cn('px-3 flex flex-col gap-1 justify-center', compact ? 'py-2 min-h-[44px]' : 'py-3 min-h-[64px]')}>
            <FlashcardMeanings card={card} textClass="text-[16px] line-clamp-2" />
          </div>
        </div>
      )}

      <div className="fc-divider mx-3 border-t border-[var(--color-border)]" />

      <div className={cn('flex items-center justify-center gap-4', compact ? 'py-2' : 'py-3')}>
        <RevealButton
          shown={reveal.shown}
          size={compact ? 'md' : 'lg'}
          onClick={(e) => { e.stopPropagation(); reveal.toggle() }}
          focusable={false}
        />
        <FlashcardStatusButtons status={card.status} size={compact ? 'md' : 'lg'} onClick={handleStatus} focusable={false} />
      </div>
    </div>
  )
}
