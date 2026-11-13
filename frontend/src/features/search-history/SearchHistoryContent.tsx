import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { searchHistoryApi } from '@/api/searchHistoryApi'
import { Button } from '@/components/ui/Button'
import type { SearchHistoryItem } from '@/types'
import { HistoryTag } from './HistoryTag'

interface SearchHistoryContentProps {
  items: SearchHistoryItem[]
  onSearch: (char: string) => void
  onRefresh: () => void
}

/** "Delete all" + the tag cloud of past searches (shared by the sidebar and the mobile popup). */
export function SearchHistoryContent({ items, onSearch, onRefresh }: SearchHistoryContentProps) {
  const { t } = useTranslation()
  const [deleting, setDeleting] = useState(false)

  const handleDeleteAll = async () => {
    setDeleting(true)
    try {
      await searchHistoryApi.deleteAll()
      onRefresh()
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteOne = async (char: string) => {
    try {
      await searchHistoryApi.deleteOne(char)
      onRefresh()
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Delete all button */}
      <div>
        <Button
          size="sm"
          onClick={handleDeleteAll}
          isLoading={deleting}
          disabled={items.length === 0}
          className="bg-[#7c5c3e] hover:bg-[#6a4f35] text-white"
        >
          {t('searchHistory.deleteAll')}
        </Button>
      </div>

      {/* Tag cloud */}
      {items.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)] italic">{t('searchHistory.empty')}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 overflow-y-auto flex-1 min-h-0 content-start">
          {items.map((item) => (
            <HistoryTag
              key={item.id}
              item={item}
              onSearch={onSearch}
              onDelete={handleDeleteOne}
            />
          ))}
        </div>
      )}
    </div>
  )
}
