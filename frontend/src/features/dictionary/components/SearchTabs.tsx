import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { LoadingDots } from '@/components/ui/LoadingDots'
import type { SearchTab } from '@/store/dictionary.store'

export function SearchTabs({ tabs, activeTabId, onSelect, onClose }: {
  tabs: SearchTab[]
  activeTabId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
}) {
  const { t } = useTranslation()
  if (tabs.length === 0) return null
  return (
    <div className="flex items-end gap-0.5 border-b border-[var(--color-border)] overflow-x-auto overflow-y-hidden">
      {tabs.map((tab) => {
        const active = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={cn(
              'group flex items-center gap-1.5 px-3 py-1.5 text-sm font-cjk rounded-t-lg border border-b-0 cursor-pointer shrink-0 transition-colors select-none',
              active
                ? 'bg-[var(--color-bg-surface)] border-[var(--color-border)] text-[var(--color-text)] -mb-px pb-2'
                : 'bg-transparent border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]',
            )}
          >
            {tab.loading && tab.results.length === 0 && <LoadingDots small />}
            <span className="truncate max-w-[200px]">{tab.query}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
              className={cn(
                'flex items-center justify-center w-4 h-4 rounded transition-colors shrink-0',
                'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]',
                active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
              title={t('dictionary.closeTab')}
            >
              <X size={11} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
