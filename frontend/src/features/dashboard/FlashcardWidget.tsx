import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Settings, RefreshCw, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import api from '@/lib/axios'
import type { FlashcardEntry, NotebookResponse } from '@/types'
import { useFlashcardStore, getIntervalMs, type FlashcardWidgetConfig } from '@/store/flashcard.store'
import { Flashcard } from '@/components/ui/Flashcard'
import { FlashcardWidgetSettings } from './FlashcardWidgetSettings'

interface Props {
  widget: FlashcardWidgetConfig
  allNotebooks: NotebookResponse[]
}

export function FlashcardWidget({ widget, allNotebooks }: Props) {
  const { t } = useTranslation()
  const { updateWidget, removeWidget, setWidgetCards } = useFlashcardStore()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const touchStartX = useRef<number | null>(null)

  const cards = widget.cards
  const total = cards.length

  // ── Fetch helpers ─────────────────────────────────────────

  const fetchCards = useCallback(async (notebookIds: number[], count: number) => {
    if (notebookIds.length === 0) return
    setLoading(true)
    try {
      const { data } = await api.get<FlashcardEntry[]>('/notebooks/flashcards', {
        params: { notebook_ids: notebookIds.join(','), count },
      })
      setWidgetCards(widget.id, data)
      setCurrentIndex(0)
    } catch {
      // silently ignore – old cards remain
    } finally {
      setLoading(false)
    }
  }, [widget.id, setWidgetCards])

  // On mount: refresh if interval has passed
  useEffect(() => {
    const needsRefresh =
      !widget.lastRefreshed ||
      Date.now() - new Date(widget.lastRefreshed).getTime() >=
        getIntervalMs(widget.intervalValue, widget.intervalUnit)

    if (needsRefresh && widget.notebookIds.length > 0) {
      fetchCards(widget.notebookIds, widget.count)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Navigation ────────────────────────────────────────────

  const safeIndex = total > 0 ? currentIndex % total : 0

  function prev() {
    if (total === 0) return
    setCurrentIndex((i) => (i - 1 + total) % total)
  }

  function next() {
    if (total === 0) return
    setCurrentIndex((i) => (i + 1) % total)
  }

  // ── Touch / swipe ─────────────────────────────────────────

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 40) {
      if (delta < 0) next()
      else prev()
    }
    touchStartX.current = null
  }

  // ── Settings callbacks ─────────────────────────────────────

  function handleSaveSettings(updates: {
    name: string
    intervalValue: number
    intervalUnit: typeof widget.intervalUnit
    count: number
    notebookIds: number[]
  }) {
    updateWidget(widget.id, { ...updates, lastRefreshed: null })
    setSettingsOpen(false)
    // Fetch with the new values immediately (not stale closure)
    fetchCards(updates.notebookIds, updates.count)
  }

  function handleDelete() {
    removeWidget(widget.id)
    setSettingsOpen(false)
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <>
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col gap-3">

        {/* Header row */}
        <div className="flex items-center justify-between min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-text)] truncate">{widget.name}</h3>
          <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
            <button
              type="button"
              onClick={() => fetchCards(widget.notebookIds, widget.count)}
              disabled={loading}
              title={t('dashboard.refresh')}
              className={cn(
                'p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors',
                loading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
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

        {/* Carousel area */}
        {loading ? (
          <div className="flex items-center justify-center h-[240px]">
            <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : total === 0 ? (
          <div className="flex items-center justify-center h-[240px] text-sm text-[var(--color-text-muted)] italic text-center px-4">
            {widget.notebookIds.length === 0
              ? t('dashboard.noSource')
              : t('dashboard.noCards')}
          </div>
        ) : (
          <div
            className="flex items-center gap-2"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <button
              type="button"
              onClick={prev}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors flex-shrink-0"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex-1 min-w-0">
              <Flashcard card={cards[safeIndex]} />
            </div>

            <button
              type="button"
              onClick={next}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors flex-shrink-0"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Progress counter */}
        {!loading && total > 0 && (
          <p className="text-center text-xs text-[var(--color-text-muted)]">
            {safeIndex + 1}/{total}
          </p>
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
    </>
  )
}
