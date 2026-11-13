import { useTranslation } from 'react-i18next'
import { SearchHistoryContent } from './SearchHistoryContent'
import { useSearchHistory } from './useSearchHistory'

interface SearchHistoryPanelProps {
  onSearch: (char: string) => void
  /** incremented externally each time a new search is recorded */
  refreshKey: number
}

/** Desktop sidebar. */
export function SearchHistoryPanel({ onSearch, refreshKey }: SearchHistoryPanelProps) {
  const { t } = useTranslation()
  const { items, refresh } = useSearchHistory(refreshKey)

  return (
    <div className="flex flex-col gap-3 h-full">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">{t('searchHistory.title')}</h2>
      <SearchHistoryContent items={items} onSearch={onSearch} onRefresh={refresh} />
    </div>
  )
}
