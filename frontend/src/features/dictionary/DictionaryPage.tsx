import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/auth.store'
import { useDictionaryStore } from '@/store/dictionary.store'
import { SearchHistoryPanel } from '@/features/search-history/SearchHistoryPanel'
import { SearchHistoryPopup } from '@/features/search-history/SearchHistoryPopup'
import { RadicalsLink } from './components/RadicalsLink'
import { SearchForm } from './components/SearchForm'
import { SearchTabs } from './components/SearchTabs'
import { TabResults } from './components/TabResults'
import { useDictionarySearch } from './hooks/useDictionarySearch'
import { useResultStatuses } from './hooks/useResultStatuses'

export function DictionaryPage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.is_admin ?? false
  const [searchParams] = useSearchParams()
  const { query, tabs, activeTabId, setQuery, setActiveTabId, closeTab } = useDictionaryStore()
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null

  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [historyPopupOpen, setHistoryPopupOpen] = useState(false)
  // Admins have no search history
  const search = useDictionarySearch(() => { if (!isAdmin) setHistoryRefreshKey((k) => k + 1) })
  const { statuses, setStatus } = useResultStatuses(activeTab, !!user)

  // Search the ?q= parameter once, on mount
  const handledParamRef = useRef(false)
  useEffect(() => {
    if (handledParamRef.current) return
    handledParamRef.current = true
    const paramQuery = searchParams.get('q')?.trim()
    if (paramQuery) search(paramQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex gap-6 items-start">
      <div className="flex flex-col gap-4 flex-1 min-w-0 max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--color-text)]">{t('dictionary.title')}</h1>
          {!isAdmin && (
            <div className="flex items-center gap-2 lg:hidden">
              <Button type="button" variant="outline" size="sm" onClick={() => setHistoryPopupOpen(true)}>
                {t('dictionary.history')}
              </Button>
              <RadicalsLink />
            </div>
          )}
        </div>

        <SearchForm
          query={query}
          onQueryChange={setQuery}
          onSearch={search}
          searching={!!activeTab?.loading && activeTab.results.length === 0}
        />
        <SearchTabs tabs={tabs} activeTabId={activeTabId} onSelect={setActiveTabId} onClose={closeTab} />
        {activeTab && (
          <TabResults tab={activeTab} statuses={statuses} showStatus={!!user} onStatusChange={setStatus} onWordClick={search} />
        )}
      </div>

      {!isAdmin && (
        <aside className="hidden lg:flex flex-col w-80 shrink-0 sticky top-20 max-h-[calc(100vh-6rem)] border border-[var(--color-border)] rounded-xl bg-[var(--color-bg-surface)] p-4 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <SearchHistoryPanel onSearch={search} refreshKey={historyRefreshKey} />
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--color-border)] shrink-0">
            <RadicalsLink />
          </div>
        </aside>
      )}

      {historyPopupOpen && !isAdmin && (
        <SearchHistoryPopup onSearch={search} refreshKey={historyRefreshKey} onClose={() => setHistoryPopupOpen(false)} />
      )}
    </div>
  )
}
