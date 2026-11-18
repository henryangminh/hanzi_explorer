import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { NotebookResponse } from '@/types'
import { NotebookCard } from './NotebookCard'

const COLLAPSED_COUNT = 8 // 2 rows of 4

interface NotebookSectionProps {
  title: string
  notebooks: NotebookResponse[]
  emptyText?: string
  /** Always show the expand chevron (otherwise only when there is more than fits collapsed). */
  alwaysShowToggle?: boolean
  /** Collapse to two rows until expanded (off: always show every notebook). */
  collapsible?: boolean
  onOpen: (nb: NotebookResponse) => void
  /** Edit button on the cards the user may edit. */
  onEdit?: (nb: NotebookResponse) => void
  canEdit?: (nb: NotebookResponse) => boolean
}

/** A titled grid of notebook cards, collapsed to two rows until expanded. */
export function NotebookSection({ title, notebooks, emptyText, alwaysShowToggle = false, collapsible = true, onOpen, onEdit, canEdit }: NotebookSectionProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const visible = expanded || !collapsible ? notebooks : notebooks.slice(0, COLLAPSED_COUNT)

  return (
    <section className="flex flex-col gap-3">
      <button
        title={collapsible ? `${t('common.expand')} / ${t('common.collapse')}` : undefined}
        disabled={!collapsible}
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider enabled:hover:text-[var(--color-text)] transition-colors w-fit"
      >
        {title} ({notebooks.length})
        {collapsible && (alwaysShowToggle || notebooks.length > COLLAPSED_COUNT) && (
          <ChevronDown size={12} className={cn('transition-transform duration-200', expanded && 'rotate-180')} />
        )}
      </button>
      {notebooks.length === 0 && emptyText ? (
        <p className="text-sm text-[var(--color-text-muted)]">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {visible.map((nb) => (
            <NotebookCard key={nb.id} notebook={nb} onClick={() => onOpen(nb)} onEdit={onEdit && canEdit?.(nb) ? () => onEdit(nb) : undefined} />
          ))}
        </div>
      )}
    </section>
  )
}
