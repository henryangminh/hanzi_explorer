import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Check, Expand } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatUmlaut } from '@/lib/pinyinColor'
import type { FlashcardEntry } from '@/types'

interface FlashcardProps {
  card: FlashcardEntry
  onStatusChange?: (status: 'learned' | 'not_learned' | null) => void
  onExpand?: () => void
  compact?: boolean
}

interface Ripple {
  key: number
  x: number
  y: number
  color: string
}

export function Flashcard({ card, onStatusChange, onExpand, compact = false }: FlashcardProps) {
  const navigate = useNavigate()
  const cardRef = useRef<HTMLDivElement>(null)
  const [ripple, setRipple] = useState<Ripple | null>(null)
  const rippleKey = useRef(0)
  const [showDef, setShowDef] = useState(false)
  const [hidingDef, setHidingDef] = useState(false)

  function toggleDef(e: React.MouseEvent) {
    e.stopPropagation()
    if (showDef) {
      setHidingDef(true)
      setTimeout(() => { setShowDef(false); setHidingDef(false) }, 200)
    } else {
      setShowDef(true)
    }
  }

  function handleStatus(clicked: 'learned' | 'not_learned', e: React.MouseEvent) {
    e.stopPropagation()
    const newStatus = card.status === clicked ? null : clicked

    const rect = cardRef.current?.getBoundingClientRect()
    if (rect) {
      rippleKey.current += 1
      setRipple({
        key: rippleKey.current,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        color: clicked === 'learned'
          ? 'rgba(16, 185, 129, 0.35)'
          : 'rgba(239, 68, 68, 0.35)',
      })
      setTimeout(() => setRipple(null), 560)
    }

    onStatusChange?.(newStatus)
  }

  const statusClass =
    card.status === 'learned' ? 'fc-status-learned'
    : card.status === 'not_learned' ? 'fc-status-not_learned'
    : undefined

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative flex flex-col border border-[var(--color-border-md)] rounded-xl shadow w-full overflow-hidden',
        'aspect-[3/5]',
        statusClass ?? 'bg-[var(--color-bg)] transition-colors duration-[450ms]',
      )}
    >
      {/* Ripple */}
      {ripple && (
        <span
          key={ripple.key}
          className="fc-ripple"
          style={{
            left: ripple.x - 28,
            top: ripple.y - 28,
            backgroundColor: ripple.color,
          }}
        />
      )}

      {onExpand && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onExpand() }}
          className="absolute top-2 right-2 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors z-10"
          title="Mở rộng"
        >
          <Expand size={compact ? 12 : 14} />
        </button>
      )}

      {/* Character + pinyin */}
      <div className={cn('flex-1 flex flex-col items-center justify-center px-4 gap-1', compact ? 'pt-4 pb-2' : 'pt-6 pb-3')}>
        <span
          className={cn('font-cjk font-bold text-[var(--color-text)] leading-none select-none cursor-pointer hover:text-[var(--color-primary)] transition-colors', compact ? 'text-4xl' : 'text-5xl')}
          onClick={() => navigate(`/dictionary?q=${encodeURIComponent(card.char)}`)}
        >
          {card.char}
        </span>
        {showDef && card.pinyins.length > 0 && (
          <span className={cn('text-xs text-[var(--color-primary)] font-medium tracking-wide', hidingDef && 'fc-hide')}>
            {formatUmlaut(card.pinyins[0])}
          </span>
        )}
        {showDef && card.sino_vn && (
          <span className={cn('text-xs text-[var(--color-text-muted)] font-medium tracking-wide', hidingDef && 'fc-hide')}>
            {card.sino_vn}
          </span>
        )}
      </div>

      {showDef && (
        <div className={hidingDef ? 'fc-hide' : 'fc-reveal'}>
          <div className="fc-divider mx-3 border-t border-[var(--color-border)]" />
          <div className={cn('px-3 flex flex-col gap-1 justify-center', compact ? 'py-2 min-h-[44px]' : 'py-3 min-h-[64px]')}>
            {card.cedict_brief && (
              <p className="text-[16px] text-[var(--color-text)] line-clamp-2 leading-snug">
                {card.cedict_brief}
              </p>
            )}
            {card.cvdict_brief && (
              <p className="text-[16px] text-[var(--color-text-muted)] line-clamp-2 leading-snug">
                {card.cvdict_brief}
              </p>
            )}
            {!card.cedict_brief && !card.cvdict_brief && (
              <p className="text-[16px] text-[var(--color-text-muted)] italic">—</p>
            )}
          </div>
        </div>
      )}

      <div className="fc-divider mx-3 border-t border-[var(--color-border)]" />

      {/* Action buttons */}
      <div className={cn('flex items-center justify-center gap-4', compact ? 'py-2' : 'py-3')}>
        <button
          type="button"
          className={cn(
            'rounded-full border-2 flex items-center justify-center transition-colors font-bold',
            compact ? 'w-7 h-7 text-[11px]' : 'w-9 h-9 text-sm',
            showDef
              ? 'border-sky-500 bg-sky-500 text-white'
              : 'border-sky-500 text-sky-500 hover:bg-sky-500 hover:text-white',
          )}
          onClick={toggleDef}
          tabIndex={-1}
        >
          ?
        </button>

        <button
          type="button"
          className={cn(
            'rounded-full border-2 flex items-center justify-center transition-colors',
            compact ? 'w-7 h-7' : 'w-9 h-9',
            card.status === 'not_learned'
              ? 'border-red-400 bg-red-400 text-white'
              : 'border-red-400 text-red-400 hover:bg-red-400 hover:text-white',
          )}
          onClick={(e) => handleStatus('not_learned', e)}
          tabIndex={-1}
        >
          <X size={compact ? 12 : 15} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          className={cn(
            'rounded-full border-2 flex items-center justify-center transition-colors',
            compact ? 'w-7 h-7' : 'w-9 h-9',
            card.status === 'learned'
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white',
          )}
          onClick={(e) => handleStatus('learned', e)}
          tabIndex={-1}
        >
          <Check size={compact ? 12 : 15} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
