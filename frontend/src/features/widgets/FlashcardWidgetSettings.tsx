import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import type { FlashcardWidgetConfig, IntervalUnit, RepeatMode } from '@/store/flashcard.store'
import type { NotebookResponse } from '@/types'
import { Button } from '@/components/ui/Button'
import { CountField } from './components/settings/CountField'
import { IntervalField } from './components/settings/IntervalField'
import { NameField } from './components/settings/NameField'
import { NotebookSourceField } from './components/settings/NotebookSourceField'
import { RepeatModeField } from './components/settings/RepeatModeField'
import { SettingsModalShell } from './components/settings/SettingsModalShell'
import { settingsErrorKey } from './validateSettings'

export interface WidgetSettingsValues {
  name: string
  intervalValue: number
  intervalUnit: IntervalUnit
  count: number
  notebookIds: number[]
  repeatMode: RepeatMode
}

interface Props {
  widget: FlashcardWidgetConfig
  allNotebooks: NotebookResponse[]
  onSave: (values: WidgetSettingsValues) => void
  onDelete?: () => void
  onClose: () => void
}

export function FlashcardWidgetSettings({ widget, allNotebooks, onSave, onDelete, onClose }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState(widget.name)
  const [intervalValue, setIntervalValue] = useState(widget.intervalValue)
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>(widget.intervalUnit)
  const [count, setCount] = useState(widget.count)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(widget.notebookIds))
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(widget.repeatMode ?? 'no_repeat')
  const [error, setError] = useState<string | null>(null)

  // The words-of-the-day widget only draws from HSK lists
  const sourceNotebooks = widget.isDefault
    ? allNotebooks.filter((nb) => nb.name.toUpperCase().includes('HSK'))
    : allNotebooks

  function toggleNotebook(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSave() {
    const errorKey = settingsErrorKey(name, intervalValue, intervalUnit, count)
    setError(errorKey && t(errorKey))
    if (errorKey) return
    onSave({ name: name.trim(), intervalValue, intervalUnit, count, notebookIds: Array.from(selectedIds), repeatMode })
  }

  const footer = (
    <>
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors"
        >
          <Trash2 size={13} />
          {t('dashboard.delete')}
        </button>
      ) : (
        <div />
      )}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
        <Button size="sm" onClick={handleSave}>{t('dashboard.save')}</Button>
      </div>
    </>
  )

  return (
    <SettingsModalShell onClose={onClose} footer={footer}>
      <div className="grid grid-cols-10 gap-4 items-start">
        <div className="col-span-10 sm:col-span-5">
          <NameField value={name} onChange={setName} />
        </div>
        <div className="col-span-7 sm:col-span-3">
          <IntervalField
            value={intervalValue}
            unit={intervalUnit}
            locked={widget.isDefault}
            onValueChange={setIntervalValue}
            onUnitChange={setIntervalUnit}
          />
        </div>
        <div className="col-span-3 sm:col-span-2">
          <CountField value={count} onChange={setCount} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
        <RepeatModeField value={repeatMode} onChange={setRepeatMode} />
        <NotebookSourceField
          notebooks={sourceNotebooks}
          selectedIds={selectedIds}
          onToggle={toggleNotebook}
          hskOnly={widget.isDefault}
        />
      </div>

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </SettingsModalShell>
  )
}
