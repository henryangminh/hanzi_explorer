import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { FlashcardWidgetConfig, IntervalUnit, RepeatMode } from '@/store/flashcard.store'
import type { NotebookResponse } from '@/types'
import { Button } from '@/components/ui/Button'

interface Props {
  widget: FlashcardWidgetConfig
  allNotebooks: NotebookResponse[]
  onSave: (updates: {
    name: string
    intervalValue: number
    intervalUnit: IntervalUnit
    count: number
    notebookIds: number[]
    repeatMode: RepeatMode
  }) => void
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

  // Default widget: only HSK notebooks; custom: all notebooks
  const availableNotebooks = widget.isDefault
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
    if (!name.trim()) {
      setError(t('dashboard.errorName'))
      return
    }
    const totalMinutes =
      intervalUnit === 'minutes' ? intervalValue
      : intervalUnit === 'hours' ? intervalValue * 60
      : intervalValue * 1440
    if (totalMinutes < 30) {
      setError(t('dashboard.minIntervalWarning'))
      return
    }
    if (count < 1) {
      setError(t('dashboard.errorCount'))
      return
    }
    setError(null)
    onSave({
      name: name.trim(),
      intervalValue,
      intervalUnit,
      count,
      notebookIds: Array.from(selectedIds),
      repeatMode,
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl shadow-xl w-full max-w-md pointer-events-auto max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] flex-shrink-0">
            <h2 className="font-semibold text-[var(--color-text)]">{t('dashboard.widgetSettings')}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">
                {t('dashboard.widgetName')}
              </label>
              <input
                type="text"
                maxLength={30}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1 text-right">{name.length}/30</p>
            </div>

            {/* Interval */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">
                {t('dashboard.interval')}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={intervalValue}
                  disabled={widget.isDefault}
                  onChange={(e) => setIntervalValue(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <select
                  value={intervalUnit}
                  disabled={widget.isDefault}
                  onChange={(e) => setIntervalUnit(e.target.value as IntervalUnit)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="minutes">{t('dashboard.minutes')}</option>
                  <option value="hours">{t('dashboard.hours')}</option>
                  <option value="days">{t('dashboard.days')}</option>
                </select>
              </div>
              {widget.isDefault
                ? <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{t('dashboard.defaultIntervalHint')}</p>
                : <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{t('dashboard.minIntervalHint')}</p>
              }
            </div>

            {/* Count */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">
                {t('dashboard.count')}
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>

            {/* Source */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">
                {t('dashboard.source')}
                {widget.isDefault && (
                  <span className="ml-2 text-[10px] normal-case font-normal text-[var(--color-text-muted)] italic">
                    (HSK only)
                  </span>
                )}
              </label>
              <div className="border border-[var(--color-border)] rounded-lg max-h-44 overflow-y-auto p-1">
                {availableNotebooks.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] p-3 italic">
                    {t('dashboard.noNotebooks')}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                    {availableNotebooks.map((nb) => (
                      <label
                        key={nb.id}
                        className="flex items-center gap-2 px-2.5 py-2 hover:bg-[var(--color-bg-subtle)] cursor-pointer rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(nb.id)}
                          onChange={() => toggleNotebook(nb.id)}
                          className="accent-[var(--color-primary)] w-4 h-4 flex-shrink-0"
                        />
                        {/* Mobile: compact single-line format */}
                        <span className="sm:hidden text-sm text-[var(--color-text)] truncate">
                          {nb.name} ({nb.entry_count})
                        </span>
                        {/* Desktop: full format with count on second line */}
                        <div className="hidden sm:block flex-1 min-w-0">
                          <span className="text-sm text-[var(--color-text)] block truncate">{nb.name}</span>
                          <span className="text-[11px] text-[var(--color-text-muted)]">
                            {nb.entry_count} {t('notebooks.entries')}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Repeat mode */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">
                {t('dashboard.repeatMode')}
              </label>
              <div className="flex flex-col gap-1">
                {([
                  { value: 'random',            labelKey: 'dashboard.repeatRandom',          hintKey: 'dashboard.repeatRandomHint'          },
                  { value: 'repeat_unlearned',  labelKey: 'dashboard.repeatRepeatUnlearned', hintKey: 'dashboard.repeatRepeatUnlearnedHint' },
                  { value: 'unlearned_only',    labelKey: 'dashboard.repeatUnlearned',       hintKey: 'dashboard.repeatUnlearnedHint'       },
                  { value: 'no_repeat',         labelKey: 'dashboard.repeatNone',            hintKey: 'dashboard.repeatNoneHint'            },
                ] as const).map(({ value, labelKey, hintKey }) => (
                  <label
                    key={value}
                    className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-bg-subtle)]"
                    style={repeatMode === value ? { borderColor: 'var(--color-primary)', background: 'var(--color-bg-subtle)' } : {}}
                  >
                    <input
                      type="radio"
                      name="repeatMode"
                      value={value}
                      checked={repeatMode === value}
                      onChange={() => setRepeatMode(value)}
                      className="accent-[var(--color-primary)] mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <span className="text-sm text-[var(--color-text)] font-medium">{t(labelKey)}</span>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{t(hintKey)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-500 font-medium">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--color-border)] flex-shrink-0">
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
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button size="sm" onClick={handleSave}>
                {t('dashboard.save')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
