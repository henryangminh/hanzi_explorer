import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { ModalOverlay } from '@/components/ui/ModalOverlay'
import { SearchHistoryContent } from './SearchHistoryContent'
import { useSearchHistory } from './useSearchHistory'

interface SearchHistoryPopupProps {
  onSearch: (char: string) => void
  refreshKey: number
  onClose: () => void
}

/** Mobile: history in a bottom sheet; picking a word closes it. */
export function SearchHistoryPopup({ onSearch, refreshKey, onClose }: SearchHistoryPopupProps) {
  const { t } = useTranslation()
  const { items, refresh } = useSearchHistory(refreshKey)

  return (
    <ModalOverlay onClose={onClose} className="items-end sm:items-center bg-black/40">
      <div className="relative w-full sm:w-[28rem] max-h-[75vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-[var(--color-bg-surface)] p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">{t('searchHistory.title')}</h2>
          <button onClick={onClose} className="p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <SearchHistoryContent items={items} onSearch={(char) => { onSearch(char); onClose() }} onRefresh={refresh} />
        </div>
      </div>
    </ModalOverlay>
  )
}
