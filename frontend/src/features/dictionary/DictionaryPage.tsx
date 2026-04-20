import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, ChevronDown, ChevronUp, BookmarkPlus, X, BookOpen } from 'lucide-react'
import { useState } from 'react'
import type { DictLiteResponse } from '@/types'
import { CharDetailPanel } from '@/features/shared/CharDetailPanel'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { ColorizedPinyin, ColorizedHanzi } from '@/lib/pinyinColor'
import { SaveToNotebookModal } from '@/features/shared/SaveToNotebookModal'
import { useAuthStore } from '@/store/auth.store'
import { useDictionaryStore } from '@/store/dictionary.store'
import { SearchHistoryPanel, SearchHistoryPopup } from '@/features/search-history/SearchHistoryPanel'

// ── Single entry card ─────────────────────────────────────

function EntryCard({
  lite,
  autoExpand = false,
  onNoteSaved,
  onWordClick,
}: {
  lite: DictLiteResponse
  autoExpand?: boolean
  onNoteSaved: () => void
  onWordClick?: (word: string) => void
}) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(!autoExpand)
  const [saveModalOpen, setSaveModalOpen] = useState(false)

  const isMultiChar = lite.char.length > 1
  const firstCedict = lite.cedict[0] ?? null
  const firstCvdict = lite.cvdict?.[0] ?? null
  const firstXdhy = lite.xdhy?.[0] ?? null
  // Fallback chain for header display
  const previewPinyin = firstCedict?.pinyin ?? firstCvdict?.pinyin ?? firstXdhy?.pinyin ?? null
  const previewTraditional = firstCedict?.traditional ?? firstCvdict?.traditional ?? firstXdhy?.traditional ?? null
  const previewMeaning = firstCedict?.meaning_en
    ?? (firstCvdict ? firstCvdict.meaning_vi.split('/').filter(Boolean)[0]?.trim() : null)
    ?? (firstXdhy ? firstXdhy.defs.find((d) => !d.is_sub)?.definition : null)
    ?? null
  const hasAnyPreview = previewPinyin !== null || previewMeaning !== null

  return (
    <div className={cn(
      'border border-[var(--color-border)] rounded-xl overflow-hidden',
      isMultiChar && 'border-[var(--color-accent)]'
    )}>
      {saveModalOpen && (
        <SaveToNotebookModal char={lite.char} onClose={() => setSaveModalOpen(false)} />
      )}

      {/* Header */}
      <div
        className="relative flex items-center gap-3 px-4 py-3 bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer"
        onClick={() => {
          if (window.getSelection()?.toString()) return
          setCollapsed((v) => !v)
        }}
      >
        <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 select-text">
          {previewPinyin ? (
            <ColorizedHanzi
              char={lite.char}
              pinyin={previewPinyin}
              className={cn('font-cjk leading-none cursor-text', isMultiChar ? 'text-3xl' : 'text-2xl')}
            />
          ) : (
            <span className={cn('font-cjk leading-none cursor-text', isMultiChar ? 'text-3xl text-[var(--color-primary)]' : 'text-2xl text-[var(--color-text)]')}>
              {lite.char}
            </span>
          )}
          {previewTraditional && previewTraditional !== lite.char && previewPinyin && (
            <span className={cn('font-cjk leading-none text-[var(--color-text-muted)] cursor-text', isMultiChar ? 'text-3xl' : 'text-2xl')}>
              (<ColorizedHanzi char={previewTraditional} pinyin={previewPinyin} />)
            </span>
          )}
          {hasAnyPreview ? (
            <div className="w-full text-sm">
              {previewPinyin && (
                <span className="font-medium cursor-text">
                  <ColorizedPinyin pinyin={previewPinyin} n={[...lite.char].length} />
                  {lite.sino_vn?.length > 0 && (
                    <span className="ml-1.5 text-[var(--color-text-muted)]">
                      · {lite.sino_vn.join(', ')}
                    </span>
                  )}
                  {lite.cedict.length > 1 && (
                    <span className="ml-1.5 text-xs text-[var(--color-text-muted)]">
                      {t('dictionary.moreReadings', { count: lite.cedict.length - 1 })}
                    </span>
                  )}
                </span>
              )}
              {previewMeaning && (
                <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5 cursor-text">
                  {previewMeaning}
                </p>
              )}
            </div>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)] italic">
              {t('dictionary.noResult')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {firstCedict?.hsk_level && (
            <span className="text-xs bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-full text-[var(--color-text-muted)]">
              HSK {firstCedict.hsk_level}
            </span>
          )}
          {lite.xdhy?.some((x) => x.pinyin.includes('//')) && (
            <span className="text-xs px-2 py-0.5 rounded border border-[var(--color-accent)] text-[var(--color-accent)] shrink-0">
              {t('dictionary.separable')}
            </span>
          )}
          <button
            onClick={() => setSaveModalOpen(true)}
            className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            title={t('notebooks.saveToNotebook')}
          >
            <BookmarkPlus size={14} />
          </button>
          <button
            title="Mở rộng / Thu gọn"
            onClick={() => setCollapsed((v) => !v)}
            className="p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 pt-2 bg-[var(--color-bg-surface)] border-t border-[var(--color-border)]">
          <CharDetailPanel
            char={lite.char}
            initialEntry={lite}
            showNotes
            onNoteSaved={onNoteSaved}
            onWordClick={onWordClick}
          />
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────

export function DictionaryPage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.is_admin ?? false
  const [searchParams] = useSearchParams()

  const {
    query,
    tabs,
    activeTabId,
    setQuery,
    addTab,
    setActiveTabId,
    closeTab,
    appendResultToTab,
    finishTab,
  } = useDictionaryStore()

  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [historyPopupOpen, setHistoryPopupOpen] = useState(false)

  const handledParamRef = useRef(false)

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null

  const runSearch = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setQuery(trimmed)

    // If a tab with this query already exists, switch to it and stop
    const existing = useDictionaryStore.getState().tabs.find((t) => t.query === trimmed)
    if (existing) {
      setActiveTabId(existing.id)
      return
    }

    const tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`
    addTab({ id: tabId, query: trimmed, results: [], loading: true, error: '' })

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(
        `/api/v1/dictionary/search?q=${encodeURIComponent(trimmed)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('access_token')
          window.location.href = '/login'
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.trim()) {
            appendResultToTab(tabId, JSON.parse(line) as DictLiteResponse)
          }
        }
      }
      if (buffer.trim()) {
        appendResultToTab(tabId, JSON.parse(buffer) as DictLiteResponse)
      }
      if (!isAdmin) setHistoryRefreshKey((k) => k + 1)
      finishTab(tabId)
    } catch {
      finishTab(tabId, t('dictionary.noResult'))
    }
  }

  // On mount: check URL ?q= param → search if present
  useEffect(() => {
    if (handledParamRef.current) return
    handledParamRef.current = true
    const paramQ = searchParams.get('q')?.trim() ?? ''
    if (paramQ) {
      runSearch(paramQ)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = async (e?: React.SyntheticEvent) => {
    e?.preventDefault()
    await runSearch(query)
  }

  const handleHistorySearch = (char: string) => {
    setQuery(char)
    runSearch(char)
  }

  return (
    <div className="flex gap-6 items-start">
      {/* ── Left: search area ── */}
      <div className="flex flex-col gap-4 flex-1 min-w-0 max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--color-text)]">
            {t('dictionary.title')}
          </h1>
          {!isAdmin && (
            <div className="flex items-center gap-2 lg:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHistoryPopupOpen(true)}
              >
                Lịch sử
              </Button>
              <Link
                to="/radicals"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#7c5c3e] hover:bg-[#6a4f35] text-white transition-colors"
              >
                <BookOpen size={14} />
                Bộ thủ
              </Link>
            </div>
          )}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập từ cần tra (vd: 我可以游泳, 指导, bukeqi, ming2tian1)"
              className={cn(
                'w-full pl-9 pr-3 py-2 rounded-lg text-sm font-cjk',
                'bg-[var(--color-bg-surface)] text-[var(--color-text)]',
                'border border-[var(--color-border)] focus:border-[var(--color-primary)]',
                'outline-none transition-colors placeholder:text-[var(--color-text-muted)] placeholder:font-sans'
              )}
            />
          </div>
          <Button type="submit" isLoading={activeTab?.loading && activeTab.results.length === 0}>
            {t('dictionary.title')}
          </Button>
        </form>

        {/* ── Tabs ── */}
        {tabs.length > 0 && (
          <div className="flex items-end gap-0.5 border-b border-[var(--color-border)] overflow-x-auto overflow-y-hidden">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={cn(
                  'group flex items-center gap-1.5 px-3 py-1.5 text-sm font-cjk rounded-t-lg border border-b-0 cursor-pointer shrink-0 transition-colors select-none',
                  tab.id === activeTabId
                    ? 'bg-[var(--color-bg-surface)] border-[var(--color-border)] text-[var(--color-text)] -mb-px pb-2'
                    : 'bg-transparent border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]'
                )}
              >
                {tab.loading && tab.results.length === 0 ? (
                  <span className="inline-flex gap-0.5 items-center shrink-0">
                    <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1 h-1 rounded-full bg-current animate-bounce" />
                  </span>
                ) : null}
                <span className="truncate max-w-[200px]">{tab.query}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                  className={cn(
                    'flex items-center justify-center w-4 h-4 rounded transition-colors shrink-0',
                    'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]',
                    tab.id === activeTabId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  )}
                  title="Đóng tab"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Active tab content ── */}
        {activeTab && (
          <div className="flex flex-col gap-2">
            {!activeTab.loading && !activeTab.error && activeTab.results.length > 0 && (
              <p className="text-xs text-[var(--color-text-muted)]">
                {t('dictionary.tabResultCount', { count: activeTab.results.length, query: activeTab.query })}
              </p>
            )}

            {activeTab.error && (
              <p className="text-sm text-red-500">{activeTab.error}</p>
            )}

            {activeTab.results.map((lite, idx) => (
              <EntryCard
                key={`${activeTab.id}-${lite.char}`}
                lite={lite}
                autoExpand={idx === 0}
                onNoteSaved={() => { }}
                onWordClick={runSearch}
              />
            ))}

            {activeTab.loading && (
              <div className="flex items-center gap-2.5 px-1 py-2 text-sm text-[var(--color-text-muted)]">
                <span>{t('common.streamingLoading')}</span>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right: history sidebar (desktop only, non-admin) ── */}
      {!isAdmin && (
        <aside className="hidden lg:flex flex-col w-80 shrink-0 sticky top-20 max-h-[calc(100vh-6rem)] border border-[var(--color-border)] rounded-xl bg-[var(--color-bg-surface)] p-4 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <SearchHistoryPanel onSearch={handleHistorySearch} refreshKey={historyRefreshKey} />
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--color-border)] shrink-0">
            <Link
              to="/radicals"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#7c5c3e] hover:bg-[#6a4f35] text-white transition-colors"
            >
              <BookOpen size={14} />
              Bộ thủ
            </Link>
          </div>
        </aside>
      )}

      {historyPopupOpen && !isAdmin && (
        <SearchHistoryPopup
          onSearch={handleHistorySearch}
          refreshKey={historyRefreshKey}
          onClose={() => setHistoryPopupOpen(false)}
        />
      )}
    </div>
  )
}
