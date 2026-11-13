import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth.store'
import { MAX_WIDGETS, useFlashcardStore, type FlashcardWidgetConfig } from '@/store/flashcard.store'
import { FlashcardWidget } from '@/features/widgets/FlashcardWidget'
import { FlashcardWidgetSettings, type WidgetSettingsValues } from '@/features/widgets/FlashcardWidgetSettings'
import { AddWidgetButton } from './components/AddWidgetButton'
import { MobileWidgetCarousel } from './components/MobileWidgetCarousel'
import { useDashboardNotebooks } from './hooks/useDashboardNotebooks'

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
  const notebooks = useDashboardNotebooks()
  const [addingWidget, setAddingWidget] = useState(false)

  // Default widget always first
  const sortedWidgets = [...widgets.filter((w) => w.isDefault), ...widgets.filter((w) => !w.isDefault)]
  const canAdd = widgets.length < MAX_WIDGETS

  function handleAddWidget(values: WidgetSettingsValues) {
    addWidget({ ...values, isDefault: false })
    setAddingWidget(false)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">
        {t('dashboard.greeting', { name: user?.display_name ?? '' })}
      </h1>

      <MobileWidgetCarousel widgets={sortedWidgets} notebooks={notebooks} canAdd={canAdd} onAdd={() => setAddingWidget(true)} />

      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {sortedWidgets.map((widget) => (
          <FlashcardWidget key={widget.id} widget={widget} allNotebooks={notebooks} />
        ))}
        {canAdd && <AddWidgetButton onClick={() => setAddingWidget(true)} />}
      </div>

      {addingWidget && (
        <FlashcardWidgetSettings
          widget={NEW_WIDGET_TEMPLATE}
          allNotebooks={notebooks}
          onSave={handleAddWidget}
          onClose={() => setAddingWidget(false)}
        />
      )}
    </div>
  )
}
