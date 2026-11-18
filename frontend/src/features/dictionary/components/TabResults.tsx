import { useTranslation } from 'react-i18next'
import { StreamingIndicator } from '@/components/ui/LoadingDots'
import type { SearchTab } from '@/store/dictionary.store'
import type { FlashcardStatus, FlashcardStatusMap } from '@/types'
import { splitByReading } from '../splitByReading'
import { EntryCard } from './EntryCard'

interface TabResultsProps {
  tab: SearchTab
  statuses: FlashcardStatusMap
  showStatus: boolean
  onStatusChange: (char: string, status: FlashcardStatus | null) => void
  onWordClick: (word: string) => void
}

/** The active tab's results — one card per reading — the first one expanded. */
export function TabResults({ tab, statuses, showStatus, onStatusChange, onWordClick }: TabResultsProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2">
      {!tab.loading && !tab.error && tab.results.length > 0 && (
        <p className="text-xs text-[var(--color-text-muted)]">
          {t('dictionary.tabResultCount', { count: tab.results.length, query: tab.query })}
        </p>
      )}
      {tab.error && <p className="text-sm text-red-500">{tab.error}</p>}
      {!tab.loading && !tab.error && tab.results.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">{t('dictionary.noResultsFor', { query: tab.query })}</p>
      )}

      {tab.results.flatMap((result, idx) => splitByReading(result).map((reading, readingIdx) => (
        <EntryCard
          key={`${tab.id}-${reading.key}`}
          entry={reading.entry}
          pinyinFilter={reading.pinyinFilter}
          autoExpand={idx === 0 && readingIdx === 0}
          status={statuses[result.char] ?? null}
          showStatus={showStatus}
          onStatusChange={onStatusChange}
          onWordClick={onWordClick}
        />
      )))}

      {tab.loading && <StreamingIndicator label={t('common.streamingLoading')} className="py-2" />}
    </div>
  )
}
