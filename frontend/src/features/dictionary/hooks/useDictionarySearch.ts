import { useTranslation } from 'react-i18next'
import { dictionaryApi } from '@/api/dictionaryApi'
import { useDictionaryStore } from '@/store/dictionary.store'

/**
 * Search into result tabs: a query that already has a tab just switches to it; otherwise a new
 * tab is opened and filled as results stream in. `onFinished` runs after a successful search.
 */
export function useDictionarySearch(onFinished: () => void) {
  const { t } = useTranslation()
  const { setQuery, addTab, setActiveTabId, appendResultToTab, finishTab } = useDictionaryStore()

  return async function search(raw: string) {
    const query = raw.trim()
    if (!query) return
    setQuery(query)

    const existing = useDictionaryStore.getState().tabs.find((tab) => tab.query === query)
    if (existing) {
      setActiveTabId(existing.id)
      return
    }

    const tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`
    addTab({ id: tabId, query, results: [], loading: true, error: '' })
    try {
      await dictionaryApi.search(query, (entries) => entries.forEach((e) => appendResultToTab(tabId, e)))
      onFinished()
      finishTab(tabId)
    } catch {
      finishTab(tabId, t('dictionary.noResult'))
    }
  }
}
