import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import type { SearchHistoryItem } from '@/types'
import { searchHistoryApi } from './searchHistoryApi'
import { Button } from '@/components/ui/Button'

// ── Tag item ──────────────────────────────────────────────

interface HistoryTagProps {
  item: SearchHistoryItem
  onSearch: (char: string) => void
  onDelete: (char: string) => void
}

function HistoryTag({ item, onSearch, onDelete }: HistoryTagProps) {
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

// ── Panel content (shared between sidebar and popup) ──────

interface SearchHistoryContentProps {
  items: SearchHistoryItem[]
  onSearch: (char: string) => void
  onRefresh: () => void
}

function SearchHistoryContent({ items, onSearch, onRefresh }: SearchHistoryContentProps) {
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

// ── Desktop sidebar panel ─────────────────────────────────

interface SearchHistoryPanelProps {
  onSearch: (char: string) => void
  /** incremented externally each time a new search is recorded */
  refreshKey: number
}

export function SearchHistoryPanel({ onSearch, refreshKey }: SearchHistoryPanelProps) {
  const { t } = useTranslation()
  const [items, setItems] = useState<SearchHistoryItem[]>([])

  const fetchHistory = useCallback(async () => {
    try {
      const { items } = await searchHistoryApi.getHistory()
      setItems(items)
    } catch {
      // silently ignore — user may not be logged in yet
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory, refreshKey])

  return (
    <div className="flex flex-col gap-3 h-full">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">{t('searchHistory.title')}</h2>
      <SearchHistoryContent items={items} onSearch={onSearch} onRefresh={fetchHistory} />
    </div>
  )
}

// ── Mobile popup ──────────────────────────────────────────

interface SearchHistoryPopupProps {
  onSearch: (char: string) => void
  refreshKey: number
  onClose: () => void
}

export function SearchHistoryPopup({ onSearch, refreshKey, onClose }: SearchHistoryPopupProps) {
  const { t } = useTranslation()
  const [items, setItems] = useState<SearchHistoryItem[]>([])

  const fetchHistory = useCallback(async () => {
    try {
      const { items } = await searchHistoryApi.getHistory()
      setItems(items)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory, refreshKey])

  return (
    <div
      className="fixed top-14 inset-x-0 bottom-0 z-[39] flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:w-[28rem] max-h-[75vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-[var(--color-bg-surface)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">{t('searchHistory.title')}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <SearchHistoryContent
            items={items}
            onSearch={(char) => { onSearch(char); onClose() }}
            onRefresh={fetchHistory}
          />
        </div>
      </div>
    </div>
  )
}
