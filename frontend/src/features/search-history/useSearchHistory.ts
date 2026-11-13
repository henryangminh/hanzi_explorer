import { useEffect, useState } from 'react'
import { searchHistoryApi } from '@/api/searchHistoryApi'
import type { SearchHistoryItem } from '@/types'

/** History items, re-fetched whenever `refreshKey` changes or `refresh()` is called. */
export function useSearchHistory(refreshKey: number) {
  const [items, setItems] = useState<SearchHistoryItem[]>([])
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    searchHistoryApi.getHistory()
      .then(({ items }) => setItems(items))
      .catch(() => { /* silently ignore — user may not be logged in yet */ })
  }, [refreshKey, reloadKey])

  return { items, refresh: () => setReloadKey((k) => k + 1) }
}
