import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import type { SearchHistoryItem } from '@/types'

interface HistoryTagProps {
  item: SearchHistoryItem
  onSearch: (char: string) => void
  onDelete: (char: string) => void
}

export function HistoryTag({ item, onSearch, onDelete }: HistoryTagProps) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-subtle)] max-w-full">
      <button
        onClick={() => onSearch(item.char)}
        className="text-sm font-cjk text-[var(--color-text)] hover:text-[var(--color-primary)] truncate cursor-pointer leading-none"
        title={item.char}
      >
        {item.char}
      </button>
      <button
        onClick={() => onDelete(item.char)}
        className="shrink-0 p-0.5 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors cursor-pointer"
        title={t('searchHistory.deleteItem', { char: item.char })}
      >
        <X size={11} />
      </button>
    </span>
  )
}
