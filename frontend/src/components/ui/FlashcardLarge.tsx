import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X as CloseIcon, Check, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatUmlaut } from '@/lib/pinyinColor'
import type { FlashcardEntry } from '@/types'
import { MiniCalendar } from './MiniCalendar'

function getLocalDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface FlashcardLargeProps {
  cards: FlashcardEntry[]
  initialIndex?: number
  onClose: () => void
  onStatusChange?: (char: string, status: 'learned' | 'not_learned' | null) => void
  isWotd?: boolean
  wotdDates?: Set<string>
  viewDate?: string | null
  onSelectDate?: (date: string) => void
  onBackToToday?: () => void
}

export function FlashcardLarge({
  cards,
  initialIndex = 0,
  onClose,
  onStatusChange,
  isWotd,
  wotdDates,
  viewDate,
  onSelectDate,
  onBackToToday,
}: FlashcardLargeProps) {
  const { t } = useTranslation()
  const goToDict = useNavigate()

  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [showDef, setShowDef] = useState(false)
  const [hidingDef, setHidingDef] = useState(false)
  const [exitClass, setExitClass] = useState('')
  const [enterKey, setEnterKey] = useState(0)
  const [entering, setEntering] = useState(true)
  const [isClosing, setIsClosing] = useState(false)
  const [calExpanded, setCalExpanded] = useState(false)
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const animating = useRef(false)
  const touchStartX = useRef<number | null>(null)

  const total = cards.length
  const safeIndex = total > 0 ? currentIndex % total : 0
  const card = total > 0 ? cards[safeIndex] : null
  const today = getLocalDateStr()

  function toggleDef() {
    if (showDef) {
      setHidingDef(true)
      setTimeout(() => { setShowDef(false); setHidingDef(false) }, 200)
    } else {
      setShowDef(true)
    }
  }

  function resetDef() {
    setHidingDef(false)
    setShowDef(false)
  }

  function triggerClose() {
    if (isClosing) return
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 200)
  }

  function navCard(dir: 'next' | 'prev') {
    if (animating.current || total === 0) return
    animating.current = true
    setExitClass(dir === 'next' ? 'fc-exit-next' : 'fc-exit-prev')
    resetDef()
    setTimeout(() => {
      setCurrentIndex((i) => dir === 'next' ? (i + 1) % total : (i - 1 + total) % total)
      setEnterKey((k) => k + 1)
      setExitClass('')
      setEntering(true)
      animating.current = false
    }, 230)
  }

  function handleStatus(status: 'learned' | 'not_learned') {
    if (!card) return
    const newStatus = card.status === status ? null : status
    onStatusChange?.(card.char, newStatus)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); navCard('prev'); break
        case 'ArrowRight': e.preventDefault(); navCard('next'); break
        case 'ArrowUp':    e.preventDefault(); handleStatus('learned'); break
        case 'ArrowDown':  e.preventDefault(); handleStatus('not_learned'); break
        case ' ':          e.preventDefault(); toggleDef(); break
        case 'Escape':     triggerClose(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, showDef, total, onClose, onStatusChange, isClosing])

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 40) navCard(delta < 0 ? 'next' : 'prev')
    touchStartX.current = null
  }

  function formatDateShort(dateStr: string) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
  }

  const statusClass =
    card?.status === 'learned' ? 'fc-status-learned'
    : card?.status === 'not_learned' ? 'fc-status-not_learned'
    : undefined

  return (
    <div className={cn("fixed inset-0 z-30 flex flex-col pt-14 pb-4 bg-[var(--color-bg)]/96 backdrop-blur-md", isClosing ? "fc-large-overlay-exit" : "fc-large-overlay-enter")}>

      {/*
        Top row (h-12 = 48px).
        Navbar ends at pt-14 (56px). Card starts at 56+48 = 104px.
        Counter center at 56+24 = 80px → equidistant 24px from both edges.
      */}
      <div className="flex-none h-12 flex items-center px-4">
        <button
          type="button"
          onClick={triggerClose}
          title={t('common.back')}
          className="sm:hidden p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <p className="flex-1 text-center text-sm text-[var(--color-text-muted)]">
          {total > 0 ? `${safeIndex + 1} / ${total}` : '—'}
        </p>
        <div className="sm:hidden w-9" />
      </div>

      {/*
        Card row — outer centers the group, inner groups card+buttons together
        so < > sit right beside the card edges, not at screen edges.
      */}
      <div
        className="flex-1 flex items-center justify-center min-h-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Inner group: [prev] [card] [next] — naturally sized, centered */}
        <div className="flex items-center gap-3 h-full">
          <button
            type="button"
            onClick={() => navCard('prev')}
            className="flex-none p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            <ChevronLeft size={28} />
          </button>

          {/* Card — height fills the row, width derived from aspect ratio */}
          <div className="h-full aspect-[3/5]">
            {card ? (
              <div
                key={enterKey}
                className={cn('h-full', entering && 'fc-large-card-enter', exitClass)}
                onAnimationEnd={() => setEntering(false)}
              >
                <div
                  className={cn(
                    '@container flex flex-col border border-[var(--color-border-md)] rounded-2xl shadow-2xl w-full h-full overflow-hidden',
                    statusClass ?? 'bg-[var(--color-bg)] transition-colors duration-[450ms]',
                  )}
                >
                  {/*
                    Character area: flex-[2] so when definition is shown (flex-[3]),
                    the split is 40% char / 60% def. When def hidden, takes 100%.
                  */}
                  <div
                    className="flex flex-col items-center justify-center px-6 gap-2 py-4 min-h-0"
                    style={{ flex: 2 }}
                  >
                    <div
                      className="font-cjk font-bold text-[var(--color-text)] leading-none select-none cursor-pointer hover:text-[var(--color-primary)] transition-colors text-center"
                      style={{
                        fontSize: card.char.length >= 4 
                          ? 'clamp(2.5rem, 22.5cqw, 4.25rem)' 
                          : card.char.length === 3
                            ? 'clamp(3rem, 28cqw, 5.5rem)'
                            : 'clamp(3.5rem, 12cqh, 7rem)',
                        wordBreak: 'keep-all'
                      }}
                      onClick={() => goToDict(`/dictionary?q=${encodeURIComponent(card.char)}`)}
                    >
                      {card.char}
                    </div>
                    {showDef && card.pinyins.length > 0 && (
                      <span className={cn('text-xl text-[var(--color-primary)] font-medium tracking-wide', hidingDef && 'fc-hide')}>
                        {formatUmlaut(card.pinyins[0])}
                      </span>
                    )}
                    {showDef && card.sino_vn && (
                      <span className={cn('text-base text-[var(--color-text-muted)] font-medium tracking-wide', hidingDef && 'fc-hide')}>
                        {card.sino_vn}
                      </span>
                    )}
                  </div>

                  {/*
                    Definition area: flex-[3] → takes 60% of card when visible.
                    Provides generous space regardless of content length.
                  */}
                  {showDef && (
                    <div
                      className={cn('flex flex-col overflow-hidden', hidingDef ? 'fc-hide' : 'fc-reveal')}
                      style={{ flex: 3 }}
                    >
                      <div className="fc-divider mx-4 border-t border-[var(--color-border)]" />
                      <div className="flex-1 px-6 py-5 flex flex-col gap-3 overflow-y-auto">
                        {card.cedict_brief && (
                          <p className="text-lg text-[var(--color-text)] leading-snug">{card.cedict_brief}</p>
                        )}
                        {card.cvdict_brief && (
                          <p className="text-lg text-[var(--color-text-muted)] leading-snug">{card.cvdict_brief}</p>
                        )}
                        {!card.cedict_brief && !card.cvdict_brief && (
                          <p className="text-lg text-[var(--color-text-muted)] italic">—</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] italic text-sm">
                {t('dashboard.noCards')}
              </div>
            )}
          </div>

          {/* Right column: close (top-aligned to counter) + next (center) — share same X */}
          <div className="flex-none h-full relative flex flex-col items-center">
            {/* Positioned absolutely to overlap perfectly with the top row (h-12) */}
            <div className="absolute -top-12 h-12 items-center justify-center hidden sm:flex">
              <button
                type="button"
                onClick={triggerClose}
                title={t('common.close')}
                className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
              >
                <CloseIcon size={18} />
              </button>
            </div>
            <div className="flex-1 flex items-center">
              <button
                type="button"
                onClick={() => navCard('next')}
                className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
              >
                <ChevronRight size={28} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex-none flex items-center justify-center gap-6 pt-3">
        <button
          type="button"
          className={cn(
            'w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors font-bold text-lg',
            showDef
              ? 'border-sky-500 bg-sky-500 text-white'
              : 'border-sky-500 text-sky-500 hover:bg-sky-500 hover:text-white',
          )}
          onClick={toggleDef}
        >
          ?
        </button>
        <button
          type="button"
          className={cn(
            'w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors',
            card?.status === 'not_learned'
              ? 'border-red-400 bg-red-400 text-white'
              : 'border-red-400 text-red-400 hover:bg-red-400 hover:text-white',
          )}
          onClick={() => handleStatus('not_learned')}
        >
          <X size={18} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          className={cn(
            'w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors',
            card?.status === 'learned'
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white',
          )}
          onClick={() => handleStatus('learned')}
        >
          <Check size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* WOTD date picker */}
      {isWotd && wotdDates && onSelectDate && (
        <div className="flex-none flex flex-col items-center pt-2">
          <div className="w-[180px]">
            <button
              type="button"
              onClick={() => setCalExpanded((v) => !v)}
              className="flex items-center justify-between w-full text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors px-1"
            >
              <span>
                {viewDate != null
                  ? t('dashboard.viewingDate', { date: formatDateShort(viewDate) })
                  : formatDateShort(today)}
              </span>
              <ChevronRight
                size={13}
                className={cn('transition-transform duration-200', calExpanded && 'rotate-90')}
              />
            </button>
            {viewDate != null && onBackToToday && (
              <button
                type="button"
                onClick={onBackToToday}
                className="text-left text-[10px] text-[var(--color-primary)] hover:underline px-1 mt-0.5"
              >
                ← {t('dashboard.backToToday')}
              </button>
            )}
            {calExpanded && (
              <MiniCalendar
                year={calMonth.year}
                month={calMonth.month}
                wotdDates={wotdDates}
                viewDate={viewDate ?? null}
                today={today}
                onSelect={(date) => { onSelectDate(date); setCalExpanded(false) }}
                onPrevMonth={() => setCalMonth((m) => {
                  const d = new Date(m.year, m.month - 1)
                  return { year: d.getFullYear(), month: d.getMonth() }
                })}
                onNextMonth={() => setCalMonth((m) => {
                  const d = new Date(m.year, m.month + 1)
                  return { year: d.getFullYear(), month: d.getMonth() }
                })}
              />
            )}
          </div>
        </div>
      )}

      {/* Keyboard hint */}
      <p className="flex-none text-center text-[10px] text-[var(--color-text-muted)] opacity-40 select-none pt-1">
        ← → {t('flashcardLarge.hintNav')} · ↑ ✓ · ↓ ✗ · Space ? · Esc {t('flashcardLarge.hintClose')}
      </p>
    </div>
  )
}
