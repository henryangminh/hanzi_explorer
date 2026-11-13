import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import type { NotebookResponse } from '@/types'

/** Card background showing learned (green) and not-learned (red) shares as a progress bar. */
function progressBackground(nb: NotebookResponse): string | undefined {
  const total = nb.entry_count
  if (total === 0) return undefined
  const learnedPct = (nb.learned_count / total) * 100
  const markedPct = learnedPct + (nb.not_learned_count / total) * 100
  if (markedPct === 0) return undefined
  const green = 'rgba(16,185,129,0.25)'
  const red = 'rgba(239,68,68,0.25)'
  return `linear-gradient(to right, ${green} 0%, ${green} ${learnedPct}%, ${red} ${learnedPct}%, ${red} ${markedPct}%, var(--color-bg-surface) ${markedPct}%)`
}

interface NotebookCardProps {
  notebook: NotebookResponse
  onClick: () => void
  onEdit?: () => void
}

export function NotebookCard({ notebook, onClick, onEdit }: NotebookCardProps) {
  const { t } = useTranslation()
  const background = progressBackground(notebook)
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      className="w-full text-left flex flex-col gap-1 px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer"
      style={background ? { background } : undefined}
    >
      <div className="flex items-start justify-between gap-1.5">
        <p className="text-sm font-semibold text-[var(--color-text)] truncate">{notebook.name}</p>
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer shrink-0"
            title={t('notebooks.editNotebook')}
          >
            <Pencil size={11} />
          </button>
        )}
      </div>
      {notebook.description && (
        <p className="text-xs text-[var(--color-text-muted)] truncate">{notebook.description}</p>
      )}
      <p className="text-xs text-[var(--color-text-muted)]">
        {notebook.entry_count} {t('notebooks.entries')}
      </p>
    </div>
  )
}
