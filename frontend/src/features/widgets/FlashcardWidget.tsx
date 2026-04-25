import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Settings, Loader2, Expand } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import api from '@/lib/axios'
import type { FlashcardEntry, NotebookResponse } from '@/types'
import { useFlashcardStore, getIntervalMs, type FlashcardWidgetConfig, type RepeatMode } from '@/store/flashcard.store'
import { Flashcard } from '@/components/ui/Flashcard'
import { FlashcardLarge } from '@/components/ui/FlashcardLarge'
import { MiniCalendar } from '@/components/ui/MiniCalendar'
import { FlashcardWidgetSettings } from './FlashcardWidgetSettings'

// ── Helpers ───────────────────────────────────────────────

function getLocalDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getStoredDateStr(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Main component ────────────────────────────────────────

interface Props {
  widget: FlashcardWidgetConfig
  allNotebooks: NotebookResponse[]
}

export function FlashcardWidget({ widget, allNotebooks }: Props) {
  const { t } = useTranslation()
  const { updateWidget, removeWidget, setWidgetCards, updateCardStatus } = useFlashcardStore()

  // Carousel state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [largeOpen, setLargeOpen] = useState(false)
  const [exitClass, setExitClass] = useState('')
  const [enterKey, setEnterKey] = useState(0)
  const [entering, setEntering] = useState(false)
  const animating = useRef(false)
  const touchStartX = useRef<number | null>(null)

  // WOTD history state (only relevant when widget.isDefault)
  const [wotdDates, setWotdDates] = useState<Set<string>>(new Set())
  const [viewDate, setViewDate] = useState<string | null>(null)   // null = current cards
  const [historyCards, setHistoryCards] = useState<FlashcardEntry[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [calExpanded, setCalExpanded] = useState(false)
  const [countdown, setCountdown] = useState('')

  // Which cards to display
  const activeCards: FlashcardEntry[] =
    viewDate !== null && historyCards !== null ? historyCards : widget.cards
  const total = activeCards.length
  const safeIndex = total > 0 ? currentIndex % total : 0

  const showLoading = loading || historyLoading

  // ── Fetch helpers ─────────────────────────────────────────

  const fetchWOTDDates = useCallback(async () => {
    try {
      const { data } = await api.get<string[]>('/wotd/dates')
      setWotdDates(new Set(data))
    } catch { /* silent */ }
  }, [])

  // Fetch new cards and save to DB for WOTD widget
  const initWOTD = useCallback(async () => {
    const today = getLocalDateStr()
    const { widgets } = useFlashcardStore.getState()
    const w = widgets.find((x) => x.id === widget.id)
    if (!w) return

    const storedDate = getStoredDateStr(w.lastRefreshed)

    if (storedDate === today && w.cards.length > 0 && w.cards[0].sino_vn !== undefined) {
      // Already have today's cards — still ensure DB record exists (idempotent)
      try {
        await api.post('/wotd', { date: today, chars: w.cards.map((c) => c.char) })
      } catch { /* silent */ }
      return
    }

    if (w.notebookIds.length === 0) return

    setLoading(true)
    try {
      const { data } = await api.get<FlashcardEntry[]>('/notebooks/flashcards', {
        params: { notebook_ids: w.notebookIds.join(','), count: w.count },
      })
      setWidgetCards(widget.id, data)
      setCurrentIndex(0)

      await api.post('/wotd', { date: today, chars: data.map((c) => c.char) })
      fetchWOTDDates()
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [widget.id, setWidgetCards, fetchWOTDDates])

  // Fetch cards for custom widget — always replaces current set with fresh cards from API
  const fetchCards = useCallback(async (notebookIds: number[], count: number) => {
    if (notebookIds.length === 0) {
      setWidgetCards(widget.id, [])
      setCurrentIndex(0)
      return
    }

    setLoading(true)
    try {
      const { widgets: curr } = useFlashcardStore.getState()
      const w = curr.find((x) => x.id === widget.id)
      const mode: RepeatMode = w?.repeatMode ?? 'random'

      // Fetch extra cards for filtered modes to compensate for post-filter reduction
      const fetchCount = mode === 'random' ? count : count * 3

      const { data } = await api.get<FlashcardEntry[]>('/notebooks/flashcards', {
        params: { notebook_ids: notebookIds.join(','), count: fetchCount },
      })

      const maxRepeat = Math.max(1, Math.floor(count * 0.1))

      let base: FlashcardEntry[]
      if (mode === 'unlearned_only') {
        // Only cards explicitly marked not_learned (red)
        base = data.filter((c) => c.status === 'not_learned').slice(0, count)
      } else if (mode === 'no_repeat') {
        // Only cards never interacted with (no status)
        base = data.filter((c) => c.status === null).slice(0, count)
      } else if (mode === 'repeat_unlearned') {
        // Mostly fresh cards, up to 10% not_learned mixed in for review
        const repeated = data.filter((c) => c.status === 'not_learned').slice(0, maxRepeat)
        const fresh = data.filter((c) => c.status === null).slice(0, count - repeated.length)
        base = [...repeated, ...fresh].sort(() => Math.random() - 0.5)
      } else {
        // random: mostly fresh, up to 10% any previously-seen (learned or not_learned)
        const repeated = data.filter((c) => c.status !== null).slice(0, maxRepeat)
        const fresh = data.filter((c) => c.status === null).slice(0, count - repeated.length)
        base = [...repeated, ...fresh].sort(() => Math.random() - 0.5)
      }

      setWidgetCards(widget.id, base)
      setCurrentIndex(0)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [widget.id, setWidgetCards])

  // ── On-mount refresh logic ────────────────────────────────

  useEffect(() => {
    if (widget.isDefault) {
      initWOTD()
      fetchWOTDDates()

      // Check for day change every minute (midnight crossover)
      const todayRef = { value: getLocalDateStr() }
      const timer = setInterval(() => {
        const now = getLocalDateStr()
        if (now !== todayRef.value) {
          todayRef.value = now
          initWOTD()
          fetchWOTDDates()
        }
      }, 60_000)
      return () => clearInterval(timer)
    }

    // Custom widget: countdown effect handles refresh timing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Countdown ticker for non-WOTD widgets
  useEffect(() => {
    if (widget.isDefault) return
    let triggered = false

    const tick = () => {
      if (triggered) return
      const { widgets } = useFlashcardStore.getState()
      const w = widgets.find((x) => x.id === widget.id)
      if (!w || w.notebookIds.length === 0) { setCountdown(''); return }

      const intervalMs = getIntervalMs(w.intervalValue, w.intervalUnit)
      const elapsed = w.lastRefreshed ? Date.now() - new Date(w.lastRefreshed).getTime() : Infinity
      const remaining = Math.max(0, intervalMs - elapsed)

      if (remaining === 0) {
        triggered = true
        fetchCards(w.notebookIds, w.count)
        setCountdown('00:00:00')
        return
      }

      const totalSecs = Math.ceil(remaining / 1000)
      const h = Math.floor(totalSecs / 3600)
      const m = Math.floor((totalSecs % 3600) / 60)
      const s = totalSecs % 60
      setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [widget.id, widget.isDefault, widget.lastRefreshed, widget.intervalValue, widget.intervalUnit, fetchCards])

  // ── Calendar date selection ───────────────────────────────

  const selectCalendarDate = useCallback(async (date: string) => {
    const today = getLocalDateStr()

    if (date === today) {
      // Back to current cards
      setViewDate(null)
      setHistoryCards(null)
      setCurrentIndex(0)
      setEnterKey((k) => k + 1)
      setEntering(true)
      return
    }

    setViewDate(date)
    setHistoryCards(null)
    setHistoryLoading(true)
    setCurrentIndex(0)
    try {
      const { data } = await api.get<FlashcardEntry[]>(`/wotd/${date}`)
      setHistoryCards(data)
      setEnterKey((k) => k + 1)
      setEntering(true)
    } catch {
      setHistoryCards([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const backToToday = useCallback(() => {
    setViewDate(null)
    setHistoryCards(null)
    setCurrentIndex(0)
    setEnterKey((k) => k + 1)
    setEntering(true)
  }, [])

  // ── Navigation ────────────────────────────────────────────

  function navigate(dir: 'next' | 'prev') {
    if (animating.current || total === 0) return
    animating.current = true
    setExitClass(dir === 'next' ? 'fc-exit-next' : 'fc-exit-prev')
    setTimeout(() => {
      setCurrentIndex((i) => dir === 'next' ? (i + 1) % total : (i - 1 + total) % total)
      setEnterKey((k) => k + 1)
      setExitClass('')
      setEntering(true)
      animating.current = false
    }, 230)
  }

  function prev() { navigate('prev') }
  function next() { navigate('next') }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 40) navigate(delta < 0 ? 'next' : 'prev')
    touchStartX.current = null
  }

  // ── Settings handlers ─────────────────────────────────────

  function handleSaveSettings(updates: {
    name: string
    intervalValue: number
    intervalUnit: typeof widget.intervalUnit
    count: number
    notebookIds: number[]
    repeatMode: RepeatMode
  }) {
    if (widget.isDefault) {
      updateWidget(widget.id, { ...updates })
    } else {
      // Reset cards so marked cards from old notebooks don't bleed into new config
      updateWidget(widget.id, { ...updates, lastRefreshed: null, cards: [] })
      fetchCards(updates.notebookIds, updates.count)
    }
    setSettingsOpen(false)
  }

  function handleDelete() {
    removeWidget(widget.id)
    setSettingsOpen(false)
  }

  async function handleCardStatusChange(char: string, status: 'learned' | 'not_learned' | null) {
    updateCardStatus(widget.id, char, status)
    try {
      await api.put('/notebooks/flashcards/status', { char, status })
    } catch { /* optimistic update stays */ }
  }

  // ── Calendar month nav helpers ────────────────────────────

  function prevMonth() {
    setCalMonth((m) => {
      const d = new Date(m.year, m.month - 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }
  function nextMonth() {
    setCalMonth((m) => {
      const d = new Date(m.year, m.month + 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  // ── Date label formatter ──────────────────────────────────

  function formatDateShort(dateStr: string) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
  }

  // ── Render ────────────────────────────────────────────────

  const today = getLocalDateStr()

  return (
    <>
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl px-1 py-4 flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-center justify-between min-w-0 px-2.5">
          <h3 className="text-sm font-semibold text-[var(--color-text)] truncate">{widget.name}</h3>
          <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
            <button
              type="button"
              onClick={() => setLargeOpen(true)}
              title={t('dashboard.expandWidget')}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              <Expand size={13} />
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              title={t('dashboard.widgetSettings')}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              <Settings size={13} />
            </button>
          </div>
        </div>

        {/* Carousel */}
        {showLoading ? (
          <div className="flex items-center justify-center h-[240px]">
            <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : total === 0 ? (
          <div className="flex items-center justify-center h-[240px] text-sm text-[var(--color-text-muted)] italic text-center px-4">
            {widget.isDefault && viewDate !== null
              ? t('dashboard.noWOTD')
              : widget.notebookIds.length === 0
                ? t('dashboard.noSource')
                : t('dashboard.noCards')}
          </div>
        ) : (
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={prev}
              className="p-0.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors flex-shrink-0">
              <ChevronLeft size={20} />
            </button>

            <div className="flex-1 min-w-0 [touch-action:pan-y]"
              onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              <div className="relative" style={{ perspective: '1000px' }}>
                {total > 2 && (
                  <div aria-hidden className="absolute inset-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)]"
                    style={{ transform: 'translateY(10px)', zIndex: 0 }} />
                )}
                {total > 1 && (
                  <div aria-hidden className="absolute inset-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)]"
                    style={{ transform: 'translateY(5px)', zIndex: 1 }} />
                )}
                <div
                  key={enterKey}
                  className={cn(entering && 'fc-enter', exitClass)}
                  onAnimationEnd={() => setEntering(false)}
                  style={{ position: 'relative', zIndex: 2 }}
                >
                  <Flashcard
                    card={activeCards[safeIndex]}
                    onStatusChange={(s) => handleCardStatusChange(activeCards[safeIndex].char, s)}
                  />
                </div>
              </div>
            </div>

            <button type="button" onClick={next}
              className="p-0.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors flex-shrink-0">
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Progress counter (centered) */}
        {!showLoading && total > 0 && (
          <p className="text-center text-xs text-[var(--color-text-muted)]">
            {safeIndex + 1}/{total}
          </p>
        )}

        {/* Countdown for non-WOTD widgets */}
        {!widget.isDefault && !showLoading && (
          <div className="border-t border-[var(--color-border)] pt-2">
            <p className="text-xs text-[var(--color-text-muted)] text-center">
              {countdown ? t('dashboard.refreshIn', { time: countdown }) : ''}
            </p>
          </div>
        )}

        {/* WOTD Calendar toggle + expandable panel */}
        {widget.isDefault && !showLoading && (
          <div className="border-t border-[var(--color-border)] pt-2 flex flex-col gap-0">
            {/* Toggle row: shows today's date or viewing date */}
            <button
              type="button"
              onClick={() => setCalExpanded((v) => !v)}
              className="flex items-center justify-between w-full text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors px-0.5"
            >
              <span>
                {viewDate !== null
                  ? t('dashboard.viewingDate', { date: formatDateShort(viewDate) })
                  : formatDateShort(today)}
              </span>
              <ChevronRight
                size={13}
                className={cn('transition-transform duration-200', calExpanded && 'rotate-90')}
              />
            </button>

            {/* "Back to today" shown when viewing history */}
            {viewDate !== null && (
              <button
                type="button"
                onClick={backToToday}
                className="text-left text-[10px] text-[var(--color-primary)] hover:underline px-0.5 mt-0.5"
              >
                ← {t('dashboard.backToToday')}
              </button>
            )}

            {/* Full calendar (expandable) */}
            {calExpanded && (
              <MiniCalendar
                year={calMonth.year}
                month={calMonth.month}
                wotdDates={wotdDates}
                viewDate={viewDate}
                today={today}
                onSelect={(date) => { selectCalendarDate(date); setCalExpanded(false) }}
                onPrevMonth={prevMonth}
                onNextMonth={nextMonth}
              />
            )}
          </div>
        )}
      </div>

      {settingsOpen && (
        <FlashcardWidgetSettings
          widget={widget}
          allNotebooks={allNotebooks}
          onSave={handleSaveSettings}
          onDelete={widget.isDefault ? undefined : handleDelete}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {largeOpen && (
        <FlashcardLarge
          cards={activeCards}
          initialIndex={safeIndex}
          onClose={() => setLargeOpen(false)}
          onStatusChange={(char, status) => handleCardStatusChange(char, status)}
          isWotd={widget.isDefault}
          wotdDates={wotdDates}
          viewDate={viewDate}
          onSelectDate={selectCalendarDate}
          onBackToToday={backToToday}
        />
      )}
    </>
  )
}
