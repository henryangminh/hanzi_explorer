import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { NotebookResponse } from '@/types'
import { FieldLabel } from './FieldLabel'

interface NotebookSourceFieldProps {
  notebooks: NotebookResponse[]
  selectedIds: Set<number>
  onToggle: (id: number) => void
  hskOnly: boolean
}

/** Searchable checkbox list of the notebooks a widget draws its cards from. */
export function NotebookSourceField({ notebooks, selectedIds, onToggle, hskOnly }: NotebookSourceFieldProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()
  const visible = term ? notebooks.filter((nb) => nb.name.toLowerCase().includes(term)) : notebooks

  return (
    <div className="relative h-[200px] sm:h-auto">
      <div className="flex flex-col h-full sm:absolute sm:inset-0">
        <FieldLabel className="flex-shrink-0">
          {t('dashboard.source')}
          {hskOnly && (
            <span className="ml-2 text-[10px] normal-case font-normal text-[var(--color-text-muted)] italic">
              ({t('dashboard.hskOnly')})
            </span>
          )}
        </FieldLabel>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('dashboard.searchNotebooks')}
          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent mb-1.5 flex-shrink-0"
        />
        <div className="border border-[var(--color-border)] rounded-lg flex-1 overflow-y-auto p-1 min-h-0">
          {visible.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] p-3 italic">
              {term ? t('dashboard.noResults') : t('dashboard.noNotebooks')}
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {visible.map((nb) => (
                <label key={nb.id} className="flex items-center gap-2 px-2.5 py-2 hover:bg-[var(--color-bg-subtle)] cursor-pointer rounded">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(nb.id)}
                    onChange={() => onToggle(nb.id)}
                    className="accent-[var(--color-primary)] w-4 h-4 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-[var(--color-text)] block truncate">{nb.name}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      {nb.entry_count} {t('notebooks.entries')}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
