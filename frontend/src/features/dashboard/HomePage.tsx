import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
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

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">

      {/* Greeting */}
      <h1 className="text-2xl font-bold text-[var(--color-text)]">
        {t('dashboard.greeting', { name: user?.display_name ?? '' })}
      </h1>

      {/* Widget grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {sortedWidgets.map((widget) => (
          <FlashcardWidget
            key={widget.id}
            widget={widget}
            allNotebooks={allNotebooks}
          />
        ))}

        {/* Add-widget button */}
        <button
          type="button"
          onClick={() => setAddingWidget(true)}
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--color-border)] rounded-xl p-8 text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors min-h-[120px]"
        >
          <Plus size={22} />
          <span className="text-sm font-medium">{t('dashboard.addWidget')}</span>
        </button>
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
