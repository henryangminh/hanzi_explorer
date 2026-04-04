import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, ChevronDown, ChevronUp, BookmarkPlus } from 'lucide-react'
import type { DictionaryResponse, UserNoteResponse } from '@/types'
import { CharDetailBody } from './CharDetailBody'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { SaveToNotebookModal } from '@/features/notebooks/SaveToNotebookModal'

// ── Single entry card ─────────────────────────────────────

function EntryCard({
  entry,
  isMultiChar,
  onNoteSaved,
  initialCollapsed = false,
}: {
  entry: DictionaryResponse
  isMultiChar: boolean
  onNoteSaved: (note: UserNoteResponse) => void
  initialCollapsed?: boolean
}) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [saveModalOpen, setSaveModalOpen] = useState(false)

  const firstCedict = entry.cedict[0] ?? null

  return (
    <div className={cn(
      'border border-[var(--color-border)] rounded-xl overflow-hidden',
      isMultiChar && 'border-[var(--color-accent)]'
    )}>
      {saveModalOpen && (
        <SaveToNotebookModal char={entry.char} onClose={() => setSaveModalOpen(false)} />
      )}
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-subtle)] transition-colors text-left"
      >
        <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className={cn(
            'font-cjk leading-none',
            isMultiChar ? 'text-3xl text-[var(--color-primary)]' : 'text-2xl text-[var(--color-text)]'
          )}>
            {entry.char}
          </span>
          {firstCedict?.traditional && firstCedict.traditional !== entry.char && (
            <span className={cn(
              'font-cjk leading-none text-[var(--color-text-muted)]',
              isMultiChar ? 'text-3xl' : 'text-2xl'
            )}>
              ({firstCedict.traditional})
            </span>
          )}
          {firstCedict ? (
            <div className="w-full text-sm">
              <span className="font-medium text-[var(--color-text)]">
                {firstCedict.pinyin}
                {entry.sino_vn?.length > 0 && (
                  <span className="ml-1.5 text-[var(--color-text-muted)]">
                    · {entry.sino_vn.join(', ')}
                  </span>
                )}
                {entry.cedict.length > 1 && (
                  <span className="ml-1.5 text-xs text-[var(--color-text-muted)]">
                    +{entry.cedict.length - 1} cách đọc
                  </span>
                )}
              </span>
              <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                {firstCedict.meaning_en}
              </p>
            </div>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)] italic">
              {t('dictionary.noResult')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {firstCedict?.hsk_level && (
            <span className="text-xs bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-full text-[var(--color-text-muted)]">
              HSK {firstCedict.hsk_level}
            </span>
          )}
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); setSaveModalOpen(true) }}
            className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            title={t('notebooks.saveToNotebook')}
          >
            <BookmarkPlus size={14} />
          </span>
          {collapsed
            ? <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
            : <ChevronUp size={14} className="text-[var(--color-text-muted)]" />
          }
        </div>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="px-4 pb-4 pt-2 bg-[var(--color-bg-surface)] border-t border-[var(--color-border)]">
          <CharDetailBody entry={entry} showNotes onNoteSaved={onNoteSaved} />
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────

export function DictionaryPage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DictionaryResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError('')
    setResults([])
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(
        `/api/v1/dictionary/search?q=${encodeURIComponent(q)}`,
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
            const entry = JSON.parse(line) as DictionaryResponse
            setResults((prev) => [...prev, entry])
          }
        }
      }
      if (buffer.trim()) {
        const entry = JSON.parse(buffer) as DictionaryResponse
        setResults((prev) => [...prev, entry])
      }
    } catch {
      setError(t('dictionary.noResult'))
    } finally {
      setLoading(false)
    }
  }

  const handleNoteSaved = (char: string, note: UserNoteResponse) => {
    setResults((prev) => prev.map((r) => (r.char === char ? { ...r, user_note: note } : r)))
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <h1 className="text-xl font-semibold text-[var(--color-text)]">
        {t('dictionary.title')}
      </h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="vd: 我可以游泳, 指导, bukeqi, ming2tian1"
            className={cn(
              'w-full pl-9 pr-3 py-2 rounded-lg text-sm font-cjk',
              'bg-[var(--color-bg-surface)] text-[var(--color-text)]',
              'border border-[var(--color-border)] focus:border-[var(--color-primary)]',
              'outline-none transition-colors placeholder:text-[var(--color-text-muted)] placeholder:font-sans'
            )}
          />
        </div>
        <Button type="submit" isLoading={loading}>{t('dictionary.title')}</Button>
      </form>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((entry, idx) => (
            <EntryCard
              key={entry.char}
              entry={entry}
              isMultiChar={entry.char.length > 1}
              initialCollapsed={idx > 0}
              onNoteSaved={(note) => handleNoteSaved(entry.char, note)}
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
  )
}
