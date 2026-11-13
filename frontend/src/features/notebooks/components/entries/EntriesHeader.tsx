import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, X } from 'lucide-react'
import { countStatuses } from '@/lib/flashcardStatus'
import type { FlashcardStatusMap, NotebookResponse } from '@/types'

interface EntriesHeaderProps {
  notebook: NotebookResponse
  shownCount: number
  totalCount: number
  statuses: FlashcardStatusMap
  onEdit?: () => void
  onDelete?: () => void
  onClose: () => void
}

const ICON_BUTTON = 'p-2 rounded-lg transition-colors'

export function EntriesHeader({ notebook, shownCount, totalCount, statuses, onEdit, onDelete, onClose }: EntriesHeaderProps) {
  const { t } = useTranslation()
  const { learned, notLearned } = countStatuses(Object.values(statuses))

  return (
    <div className="flex items-start justify-between px-6 pt-5 pb-3 shrink-0 border-b border-[var(--color-border)]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-semibold text-[var(--color-text)]">{notebook.name}</h2>
          {notebook.type === 'global' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-primary)] border border-[var(--color-border)]">
              {t('notebooks.globalSection')}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 flex flex-wrap gap-x-2">
          <span>{shownCount}{shownCount !== totalCount ? `/${totalCount}` : ''} {t('notebooks.entries')}</span>
          {learned > 0 && <span style={{ color: '#0d9363' }} className="font-semibold">{t('notebooks.learnedCount', { count: learned })}</span>}
          {notLearned > 0 && <span className="text-red-500 dark:text-red-400 font-semibold">{t('notebooks.notLearnedCount', { count: notLearned })}</span>}
        </p>
        {notebook.description && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5 italic">{notebook.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 ml-3 shrink-0">
        {onEdit && (
          <button onClick={onEdit} className={`${ICON_BUTTON} text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]`} title={t('notebooks.editNotebook')}>
            <Pencil size={15} />
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className={`${ICON_BUTTON} text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`} title={t('notebooks.deleteNotebook')}>
            <Trash2 size={15} />
          </button>
        )}
        <button title={t('common.close')} onClick={onClose} className={`${ICON_BUTTON} text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]`}>
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
