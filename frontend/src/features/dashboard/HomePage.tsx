import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import api from '@/lib/axios'
import { useAuthStore } from '@/store/auth.store'
import { useFlashcardStore, type FlashcardWidgetConfig } from '@/store/flashcard.store'
import type { NotebookResponse } from '@/types'
import { FlashcardWidget } from '@/features/widgets/FlashcardWidget'
import { FlashcardWidgetSettings } from '@/features/widgets/FlashcardWidgetSettings'

// Blank widget template used when creating a new widget via the modal
const NEW_WIDGET_TEMPLATE: FlashcardWidgetConfig = {
  id: '',
  name: '',
  intervalValue: 1,
  intervalUnit: 'days',
  count: 10,
  notebookIds: [],
  isDefault: false,
  lastRefreshed: null,
  cards: [],
  repeatMode: 'no_repeat',
}

export function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { widgets, addWidget } = useFlashcardStore()

  const [allNotebooks, setAllNotebooks] = useState<NotebookResponse[]>([])
  const [notebooksLoaded, setNotebooksLoaded] = useState(false)
  const [addingWidget, setAddingWidget] = useState(false)
  const [mobileIndex, setMobileIndex] = useState(0)
  const mobileTouchStartX = useRef<number | null>(null)

  // ── Load notebooks ────────────────────────────────────────
  useEffect(() => {
    api.get<NotebookResponse[]>('/notebooks')
      .then(({ data }) => {
        setAllNotebooks(data)
        setNotebooksLoaded(true)
      })
      .catch(() => setNotebooksLoaded(true))
  }, [])

  // ── Initialize default "Words of the Day" widget ──────────
  useEffect(() => {
    if (!notebooksLoaded) return
    const hasDefault = widgets.some((w) => w.isDefault)
    if (!hasDefault) {
      const hskNotebooks = allNotebooks.filter((nb) =>
        nb.name.toUpperCase().includes('HSK')
      )
      addWidget({
        name: t('dashboard.wordsOfDay'),
        intervalValue: 1,
        intervalUnit: 'days',
        count: 10,
        notebookIds: hskNotebooks.map((nb) => nb.id),
        isDefault: true,
      })
    }
  // Only run when notebooks finish loading; widgets intentionally excluded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebooksLoaded])

  // ── Sort: default widget always first ─────────────────────
  const sortedWidgets = [
    ...widgets.filter((w) => w.isDefault),
    ...widgets.filter((w) => !w.isDefault),
  ]

  // ── Add-widget handler ────────────────────────────────────
  function handleAddWidget(updates: {
    name: string
    intervalValue: number
    intervalUnit: FlashcardWidgetConfig['intervalUnit']
    count: number
    notebookIds: number[]
    repeatMode: FlashcardWidgetConfig['repeatMode']
  }) {
    addWidget({ ...updates, isDefault: false })
    setAddingWidget(false)
  }

  // ── Mobile carousel helpers ───────────────────────────────
  // Include add-widget slot as last carousel item when < 3 widgets
  const mobileItems: Array<{ type: 'widget'; id: string } | { type: 'add' }> = [
    ...sortedWidgets.map((w) => ({ type: 'widget' as const, id: w.id })),
    ...(widgets.length < 3 ? [{ type: 'add' as const }] : []),
  ]
  const safeMobileIndex = mobileItems.length > 0 ? mobileIndex % mobileItems.length : 0

  function navMobile(dir: 'prev' | 'next') {
    const len = mobileItems.length
    if (len === 0) return
    setMobileIndex((i) => dir === 'next' ? (i + 1) % len : (i - 1 + len) % len)
  }

  function handleMobileTouchStart(e: React.TouchEvent) {
    mobileTouchStartX.current = e.touches[0].clientX
  }

  function handleMobileTouchEnd(e: React.TouchEvent) {
    if (mobileTouchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - mobileTouchStartX.current
    if (Math.abs(delta) > 40) navMobile(delta < 0 ? 'next' : 'prev')
    mobileTouchStartX.current = null
  }

  const currentMobileItem = mobileItems[safeMobileIndex]

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">

      {/* Greeting */}
      <h1 className="text-2xl font-bold text-[var(--color-text)]">
        {t('dashboard.greeting', { name: user?.display_name ?? '' })}
      </h1>

      {/* Mobile carousel (< sm) */}
      <div className="sm:hidden flex flex-col gap-3">
        {/* Grid overlay: all items in same cell so height = tallest item, no layout shift */}
        <div
          className="grid grid-rows-1 grid-cols-1 [touch-action:pan-y]"
          onTouchStart={handleMobileTouchStart}
          onTouchEnd={handleMobileTouchEnd}
        >
          {sortedWidgets.map((w) => {
            const isActive = currentMobileItem?.type === 'widget' && currentMobileItem.id === w.id
            return (
              <div
                key={w.id}
                className="row-start-1 col-start-1"
                style={{ visibility: isActive ? 'visible' : 'hidden', pointerEvents: isActive ? 'auto' : 'none' }}
              >
                <FlashcardWidget widget={w} allNotebooks={allNotebooks} />
              </div>
            )
          })}
          {widgets.length < 3 && (
            <div
              className="row-start-1 col-start-1 flex items-center justify-center"
              style={{
                visibility: currentMobileItem?.type === 'add' ? 'visible' : 'hidden',
                pointerEvents: currentMobileItem?.type === 'add' ? 'auto' : 'none',
              }}
            >
              <button
                type="button"
                onClick={() => setAddingWidget(true)}
                className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--color-border)] rounded-xl p-8 text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors min-h-[120px]"
              >
                <Plus size={22} />
                <span className="text-sm font-medium">{t('dashboard.addWidget')}</span>
              </button>
            </div>
          )}
        </div>
        {mobileItems.length > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navMobile('prev')}
              className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-2">
              {mobileItems.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-colors',
                    i === safeMobileIndex ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]',
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => navMobile('next')}
              className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Desktop grid (>= sm) */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {sortedWidgets.map((widget) => (
          <FlashcardWidget
            key={widget.id}
            widget={widget}
            allNotebooks={allNotebooks}
          />
        ))}
        {widgets.length < 3 && (
          <button
            type="button"
            onClick={() => setAddingWidget(true)}
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--color-border)] rounded-xl p-8 text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors min-h-[120px]"
          >
            <Plus size={22} />
            <span className="text-sm font-medium">{t('dashboard.addWidget')}</span>
          </button>
        )}
      </div>

      {/* Add-widget settings modal */}
      {addingWidget && (
        <FlashcardWidgetSettings
          widget={NEW_WIDGET_TEMPLATE}
          allNotebooks={allNotebooks}
          onSave={handleAddWidget}
          onClose={() => setAddingWidget(false)}
        />
      )}
    </div>
  )
}
