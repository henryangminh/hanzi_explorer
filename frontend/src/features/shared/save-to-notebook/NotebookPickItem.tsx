import { useTranslation } from 'react-i18next'
import { AlertCircle, BookmarkPlus, Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { NotebookResponse } from '@/types'

export type SaveFeedback = 'ok' | 'dup'

interface NotebookPickItemProps {
  notebook: NotebookResponse
  saving: boolean
  feedback: SaveFeedback | null
  onPick: () => void
}

function StateIcon({ saving, feedback }: { saving: boolean; feedback: SaveFeedback | null }) {
  if (saving) return <span className="text-xs text-[var(--color-text-muted)]">...</span>
  if (feedback === 'ok') return <Check size={15} className="text-green-500" />
  if (feedback === 'dup') return <AlertCircle size={15} className="text-orange-400" />
  return <BookmarkPlus size={15} className="text-[var(--color-text-muted)]" />
}

/** A notebook to save the word into, showing saved / already-there feedback. */
export function NotebookPickItem({ notebook, saving, feedback, onPick }: NotebookPickItemProps) {
  const { t } = useTranslation()
  return (
    <li>
      <button
        onClick={onPick}
        disabled={saving || feedback === 'ok'}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left',
          feedback === 'ok' ? 'border-green-400/40 bg-green-50 dark:bg-green-900/20'
            : feedback === 'dup' ? 'border-orange-400/40 bg-orange-50 dark:bg-orange-900/20'
            : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)]',
        )}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-text)] truncate">{notebook.name}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {notebook.entry_count} {t('notebooks.entries')}
          </p>
        </div>
        <div className="shrink-0">
          <StateIcon saving={saving} feedback={feedback} />
        </div>
      </button>
      {feedback === 'dup' && (
        <p className="text-xs text-orange-500 mt-0.5 px-1">
          {t('notebooks.alreadyExists')} "{notebook.name}"
        </p>
      )}
    </li>
  )
}
