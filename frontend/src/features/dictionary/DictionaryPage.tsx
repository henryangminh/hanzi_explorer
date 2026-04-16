import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, ChevronDown, ChevronUp, BookmarkPlus } from 'lucide-react'
import type { DictLiteResponse, DictionaryResponse, UserNoteResponse } from '@/types'
import { CharDetailPanel } from '@/features/shared/CharDetailPanel'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { SaveToNotebookModal } from '@/features/notebooks/SaveToNotebookModal'
import { useAuthStore } from '@/store/auth.store'
import { SearchHistoryPanel, SearchHistoryPopup } from '@/features/search-history/SearchHistoryPanel'

// ── Single entry card ─────────────────────────────────────

/**
 * EntryCard nhận DictLiteResponse từ search stream.
 * Khi expand, CharDetailPanel tự fetch Wiktionary (lazy, cache phía server).
 * Card đầu tiên (autoExpand=true) mở sẵn và CharDetailPanel bắt đầu fetch Wiktionary ngay.
 */
function EntryCard({
  lite,
  autoExpand = false,
  onNoteSaved,
}: {
  lite: DictLiteResponse
  autoExpand?: boolean
  onNoteSaved: (note: UserNoteResponse) => void
}) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(!autoExpand)
  const [saveModalOpen, setSaveModalOpen] = useState(false)

  const isMultiChar = lite.char.length > 1
  const firstCedict = lite.cedict[0] ?? null

  return (
    <div className={cn(
      'border border-[var(--color-border)] rounded-xl overflow-hidden',
      isMultiChar && 'border-[var(--color-accent)]'
    )}>
      {saveModalOpen && (
        <SaveToNotebookModal char={lite.char} onClose={() => setSaveModalOpen(false)} />
      )}

      {/* Header — text is selectable; blank-area click toggles expand */}
      <div
        className="relative flex items-center gap-3 px-4 py-3 bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer"
        onClick={() => {
          // Don't toggle if user is selecting text
          if (window.getSelection()?.toString()) return
          setCollapsed((v) => !v)
        }}
      >
        {/* Text content — selectable, propagation flows up to parent toggle */}
        <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 select-text">
          <span className={cn(
            'font-cjk leading-none cursor-text',
            isMultiChar ? 'text-3xl text-[var(--color-primary)]' : 'text-2xl text-[var(--color-text)]'
          )}>
            {lite.char}
          </span>
          {firstCedict?.traditional && firstCedict.traditional !== lite.char && (
            <span className={cn(
              'font-cjk leading-none text-[var(--color-text-muted)] cursor-text',
              isMultiChar ? 'text-3xl' : 'text-2xl'
            )}>
              ({firstCedict.traditional})
            </span>
          )}
          {firstCedict ? (
            <div className="w-full text-sm">
              <span className="font-medium text-[var(--color-text)] cursor-text">
                {firstCedict.pinyin}
                {lite.sino_vn?.length > 0 && (
                  <span className="ml-1.5 text-[var(--color-text-muted)]">
                    · {lite.sino_vn.join(', ')}
                  </span>
                )}
                {lite.cedict.length > 1 && (
                  <span className="ml-1.5 text-xs text-[var(--color-text-muted)]">
                    +{lite.cedict.length - 1} cách đọc
                  </span>
                )}
              </span>
              <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5 cursor-text">
                {firstCedict.meaning_en}
              </p>
            </div>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)] italic">
              {t('dictionary.noResult')}
            </span>
          )}
        </div>

        {/* Right actions */}
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


      {/* Body */}
      {!collapsed && (
        <div className="px-4 pb-4 pt-2 bg-[var(--color-bg-surface)] border-t border-[var(--color-border)]">
          <CharDetailPanel
            char={lite.char}
            initialEntry={lite}
            showNotes
            onNoteSaved={onNoteSaved}
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

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DictLiteResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [historyPopupOpen, setHistoryPopupOpen] = useState(false)

  const runSearch = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    setResults([])
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
            const entry = JSON.parse(line) as DictLiteResponse
            setResults((prev) => [...prev, entry])
          }
        }
      }
      if (buffer.trim()) {
        const entry = JSON.parse(buffer) as DictLiteResponse
        setResults((prev) => [...prev, entry])
      }
      // Refresh history panel after a successful search (backend records it)
      if (!isAdmin) setHistoryRefreshKey((k) => k + 1)
    } catch {
      setError(t('dictionary.noResult'))
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e?: React.FormEvent) => {
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
      <div className="flex flex-col gap-5 flex-1 min-w-0 max-w-2xl">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          {t('dictionary.title')}
        </h1>

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
          <Button type="submit" isLoading={loading}>{t('dictionary.title')}</Button>
          {/* Mobile-only: history button */}
          {!isAdmin && (
            <Button
              type="button"
              variant="outline"
              className="lg:hidden shrink-0"
              onClick={() => setHistoryPopupOpen(true)}
            >
              Lịch sử
            </Button>
          )}
        </form>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((lite, idx) => (
              <EntryCard
                key={lite.char}
                lite={lite}
                autoExpand={idx === 0}
                onNoteSaved={(_note) => {}}
              />
            ))}
            {loading && (
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
        <aside className="hidden lg:flex flex-col w-80 shrink-0 sticky top-20 max-h-[calc(100vh-6rem)] border border-[var(--color-border)] rounded-xl bg-[var(--color-bg-surface)] p-4">
          <SearchHistoryPanel onSearch={handleHistorySearch} refreshKey={historyRefreshKey} />
        </aside>
      )}

      {/* ── Mobile history popup ── */}
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
