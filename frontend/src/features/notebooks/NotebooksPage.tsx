import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, X, Check, ChevronDown, ChevronLeft, BookmarkPlus, Pencil } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import api from '@/lib/axios'
import { cn } from '@/lib/cn'
import { ColorizedPinyin, ColorizedHanzi } from '@/lib/pinyinColor'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuthStore } from '@/store/auth.store'
import { useNotebookStore } from '@/store/notebook.store'
import { CharDetailPanel } from '@/features/shared/CharDetailPanel'
import { SaveToNotebookModal } from '@/features/shared/SaveToNotebookModal'
import type { NotebookEntryPreview, NotebookResponse, NotebookSortOrder } from '@/types'
import { useUIStore } from '@/store/ui.store'
import { useNavigate } from 'react-router-dom'
import { useDictionaryStore } from '@/store/dictionary.store'
import { useFlashcardStore } from '@/store/flashcard.store'

const SORT_OPTIONS: { value: NotebookSortOrder; labelKey: string }[] = [
  { value: 'updated_at_desc', labelKey: 'notebooks.sortUpdatedDesc' },
  { value: 'updated_at_asc', labelKey: 'notebooks.sortUpdatedAsc' },
  { value: 'name_asc', labelKey: 'notebooks.sortNameAsc' },
  { value: 'name_desc', labelKey: 'notebooks.sortNameDesc' },
  { value: 'created_at_desc', labelKey: 'notebooks.sortCreatedDesc' },
  { value: 'created_at_asc', labelKey: 'notebooks.sortCreatedAsc' },
]

// ── Notebook entries modal ────────────────────────────────

function NotebookEntriesModal({
  notebook,
  canEdit,
  onClose,
  onDeleted,
  onEdit,
}: {
  notebook: NotebookResponse
  canEdit: boolean
  onClose: () => void
  onDeleted: () => void
  onEdit?: () => void
}) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<NotebookEntryPreview[]>([])
  const [sort, setSort] = useState<NotebookSortOrder>('updated_at_desc')
  const [loading, setLoading] = useState(true)
  const [fcStatuses, setFcStatuses] = useState<Record<string, 'learned' | 'not_learned' | null>>({})
  const [ripple, setRipple] = useState<{ char: string; key: number; x: number; y: number; color: string } | null>(null)
  const rippleKey = useRef(0)
  const { widgets, updateCardStatus } = useFlashcardStore()
  const [removingChar, setRemovingChar] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // inline detail view
  const { selectedNotebookChar: selectedChar, setSelectedNotebookChar: setSelectedChar } = useUIStore()
  const navigate = useNavigate()
  const { tabs, setActiveTabId } = useDictionaryStore()
  const [saveModalChar, setSaveModalChar] = useState<string | null>(null)

  const parentRef = useRef<HTMLDivElement>(null)

  const entryRows = useMemo(() => {
    const rows = []
    for (let i = 0; i < entries.length; i += 2) {
      rows.push(entries.slice(i, i + 2))
    }
    return rows
  }, [entries])

  const rowVirtualizer = useVirtualizer({
    count: entryRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
    overscan: 5,
  })

  const handleGoToDict = (word: string) => {
    const existingTab = tabs.find((t) => t.query === word && t.results.length > 0)
    if (existingTab) {
      setActiveTabId(existingTab.id)
      navigate('/dictionary')
    } else {
      navigate(`/dictionary?q=${encodeURIComponent(word)}`)
    }
  }

  const pendingRef = useRef<NotebookEntryPreview[]>([])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    pendingRef.current = []

    const run = async () => {
      setLoading(true)
      setEntries([])
      try {
        const token = localStorage.getItem('access_token')
        const response = await fetch(
          `/api/v1/notebooks/${notebook.id}/entries/preview?sort=${sort}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal }
        )
        if (!response.ok || signal.aborted) return
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        // Flush buffered entries to state every 60ms to avoid per-entry re-renders
        const flushInterval = setInterval(() => {
          if (pendingRef.current.length === 0) return
          const batch = pendingRef.current.splice(0)
          setEntries((prev) => [...prev, ...batch])
        }, 60)

        while (true) {
          const { done, value } = await reader.read()
          if (signal.aborted) { reader.cancel(); break }
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (line.trim()) {
              pendingRef.current.push(JSON.parse(line) as NotebookEntryPreview)
            }
          }
        }
        if (!signal.aborted && buffer.trim()) {
          pendingRef.current.push(JSON.parse(buffer) as NotebookEntryPreview)
        }

        clearInterval(flushInterval)
        // Final flush
        if (!signal.aborted && pendingRef.current.length > 0) {
          const batch = pendingRef.current.splice(0)
          setEntries((prev) => [...prev, ...batch])
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') throw err
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }

    run()
    return () => controller.abort()
  }, [notebook.id, sort])

  useEffect(() => {
    if (loading || entries.length === 0) return
    const chars = entries.map((e) => e.char).join(',')
    api.get<Record<string, 'learned' | 'not_learned' | null>>(
      `/notebooks/flashcards/statuses?chars=${encodeURIComponent(chars)}`
    )
      .then(({ data }) => setFcStatuses(data))
      .catch(() => {})
  }, [loading, entries.length])

  async function handleFcStatus(char: string, clicked: 'learned' | 'not_learned', e: React.MouseEvent) {
    e.stopPropagation()
    const newStatus = fcStatuses[char] === clicked ? null : clicked
    const card = (e.currentTarget as HTMLElement).closest('[data-fc-card]')
    if (card) {
      const rect = card.getBoundingClientRect()
      rippleKey.current += 1
      setRipple({
        char,
        key: rippleKey.current,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        color: clicked === 'learned' ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)',
      })
      setTimeout(() => setRipple(null), 560)
    }
    setFcStatuses((prev) => ({ ...prev, [char]: newStatus }))
    try {
      await api.put('/notebooks/flashcards/status', { char, status: newStatus })
    } catch { /* silent */ }
    for (const w of widgets) {
      if (w.cards.some((c) => c.char === char)) updateCardStatus(w.id, char, newStatus)
    }
  }

  const handleSelectChar = (char: string) => {
    if (selectedChar === char) {
      setSelectedChar(null)
      return
    }
    setSelectedChar(char)
  }

  const handleRemoveEntry = async (entry: NotebookEntryPreview) => {
    setRemovingChar(entry.char)
    try {
      await api.delete(`/notebooks/${notebook.id}/entries/${encodeURIComponent(entry.char)}`)
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
      if (selectedChar === entry.char) { setSelectedChar(null) }
    } finally {
      setRemovingChar(null)
    }
  }

  const handleDeleteNotebook = async () => {
    setDeleting(true)
    try {
      await api.delete(`/notebooks/${notebook.id}`)
      onDeleted()
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed top-14 inset-x-0 bottom-0 z-[39] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-3xl h-full max-h-[90vh] bg-[var(--color-bg-surface)] rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3 shrink-0 border-b border-[var(--color-border)]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-[var(--color-text)]">{notebook.name}</h2>
              {notebook.type === 'global' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-primary)] border border-[var(--color-border)]">
                  {t('notebooks.globalSection')}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 flex flex-wrap gap-x-2">
              <span>{entries.length} {t('notebooks.entries')}</span>
              {Object.keys(fcStatuses).length > 0 && (() => {
                const learned = Object.values(fcStatuses).filter((s) => s === 'learned').length
                const unlearned = Object.values(fcStatuses).filter((s) => s === 'not_learned').length
                return (
                  <>
                    {learned > 0 && <span style={{ color: '#0d9363' }} className="font-semibold">Đã học: {learned}</span>}
                    {unlearned > 0 && <span className="text-red-500 dark:text-red-400 font-semibold">Chưa học: {unlearned}</span>}
                  </>
                )
              })()}
            </p>
            {notebook.description && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5 italic">
                {notebook.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-3 shrink-0">
            {canEdit && onEdit && (
              <button
                onClick={onEdit}
                className="p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                title={t('notebooks.editNotebook')}
              >
                <Pencil size={15} />
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title={t('notebooks.deleteNotebook')}
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              title="Đóng / Close"
              onClick={onClose}
              className="p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Sort — only in list view */}
        {!selectedChar && (
          <div className="px-6 py-2 shrink-0">
            <Select
              value={sort}
              options={SORT_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
              onChange={setSort}
            />
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6" ref={parentRef}>
          {/* ── Detail view ── */}
          {saveModalChar && (
            <SaveToNotebookModal
              char={saveModalChar}
              excludeNotebookId={notebook.id}
              onClose={() => setSaveModalChar(null)}
            />
          )}
          {selectedChar ? (
            <div className="flex flex-col gap-4 pt-3">
              {/* Back + save */}
              <div className="flex items-center justify-between">
                <button
                  title={t('common.back')}
                  onClick={() => { setSelectedChar(null) }}
                  className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  <ChevronLeft size={14} />
                  {t('common.back')}
                </button>
                <button
                  onClick={() => setSaveModalChar(selectedChar)}
                  className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                  title={t('notebooks.saveToNotebook')}
                >
                  <BookmarkPlus size={15} />
                </button>
              </div>

              {/* CharDetailPanel self-manages: shows DB data first, then lazy-loads Wiktionary */}
              <CharDetailPanel char={selectedChar} showNotes={true} onWordClick={handleGoToDict} />
            </div>
          ) : (
            /* ── Grid view ── */
            loading && entries.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-8">{t('common.loading')}</p>
            ) : !loading && entries.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-8">{t('notebooks.emptyEntries')}</p>
            ) : (
              <>
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                  className="mt-2"
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const rowEntries = entryRows[virtualRow.index]
                    return (
                      <div
                        key={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        className="grid grid-cols-2 gap-2 pb-2"
                      >
                        {rowEntries.map((entry) => (
                          <div
                            key={entry.id}
                            data-fc-card
                            onClick={() => handleSelectChar(entry.char)}
                            className={cn(
                              'relative overflow-hidden text-left flex flex-col gap-1 px-3 py-2.5 rounded-xl border transition-colors cursor-pointer',
                              fcStatuses[entry.char] === 'learned' ? 'fc-status-learned'
                                : fcStatuses[entry.char] === 'not_learned' ? 'fc-status-not_learned'
                                : 'border-[var(--color-border)] bg-[var(--color-bg-subtle)] hover:border-[var(--color-primary)]',
                            )}
                          >
                            {ripple?.char === entry.char && (
                              <span
                                key={ripple.key}
                                className="fc-ripple"
                                style={{ left: ripple.x - 28, top: ripple.y - 28, backgroundColor: ripple.color }}
                              />
                            )}
                            <div className="flex items-start justify-between gap-1.5">
                              {/* Selectable char + traditional */}
                              <div
                                className="flex items-baseline gap-1.5 flex-wrap min-w-0 select-text"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {entry.pinyins[0]
                                  ? <ColorizedHanzi char={entry.char} pinyin={entry.pinyins[0]} className="font-cjk text-2xl leading-none cursor-text" />
                                  : <span className="font-cjk text-2xl text-[var(--color-text)] leading-none cursor-text">{entry.char}</span>}
                                {entry.traditional && entry.pinyins[0] && (
                                  <span className="font-cjk text-2xl text-[var(--color-text-muted)] leading-none cursor-text">
                                    (<ColorizedHanzi char={entry.traditional} pinyin={entry.pinyins[0]} />)
                                  </span>
                                )}
                                {entry.traditional && !entry.pinyins[0] && (
                                  <span className="font-cjk text-2xl text-[var(--color-text-muted)] leading-none cursor-text">({entry.traditional})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={(e) => handleFcStatus(entry.char, 'not_learned', e)}
                                  className={cn(
                                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                                    fcStatuses[entry.char] === 'not_learned'
                                      ? 'border-red-400 bg-red-400 text-white'
                                      : 'border-red-400 text-red-400 hover:bg-red-400 hover:text-white',
                                  )}
                                  title="Chưa thuộc"
                                >
                                  <X size={8} strokeWidth={2.5} />
                                </button>
                                <button
                                  onClick={(e) => handleFcStatus(entry.char, 'learned', e)}
                                  className={cn(
                                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                                    fcStatuses[entry.char] === 'learned'
                                      ? 'border-emerald-500 bg-emerald-500 text-white'
                                      : 'border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white',
                                  )}
                                  title="Đã thuộc"
                                >
                                  <Check size={8} strokeWidth={2.5} />
                                </button>
                                {canEdit && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRemoveEntry(entry) }}
                                    disabled={removingChar === entry.char}
                                    className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-red-400 transition-colors disabled:opacity-40"
                                    title={t('notebooks.removeEntry')}
                                  >
                                    <X size={11} />
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* Selectable pinyin / sino_vn / meanings — w-fit so only text area is selectable */}
                            {entry.pinyins.length > 0 && (
                              <p
                                className="w-fit text-xs leading-tight cursor-text select-text"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {entry.pinyins.map((p, pi) => {
                                  const formatted = (() => {
                                    if (!entry.is_separable) return p
                                    const idx = p.indexOf(' ')
                                    return idx === -1 ? p : p.slice(0, idx) + '//' + p.slice(idx + 1)
                                  })()
                                  return (
                                    <span key={pi}>
                                      {pi > 0 && <span className="text-[var(--color-text-muted)]">, </span>}
                                      <ColorizedPinyin pinyin={formatted} />
                                    </span>
                                  )
                                })}
                                {entry.sino_vn?.length > 0 && (
                                  <span className="text-[var(--color-primary)]"> · {entry.sino_vn.join(', ')}</span>
                                )}
                              </p>
                            )}
                            {entry.cedict_brief && (
                              <p
                                className="w-fit max-w-full text-xs text-[var(--color-text-muted)] line-clamp-1 leading-tight cursor-text select-text"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {entry.cedict_brief}
                              </p>
                            )}
                            {entry.cvdict_brief && (
                              <p
                                className="w-fit max-w-full text-xs text-[var(--color-primary)] line-clamp-1 leading-tight cursor-text select-text"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {entry.cvdict_brief}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
                {loading && (
                  <div className="flex items-center gap-2.5 px-1 py-3 text-sm text-[var(--color-text-muted)]">
                    <span>{t('common.streamingLoading')}</span>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce" />
                    </div>
                  </div>
                )}
              </>
            )
          )}
        </div>
      </div>

      {/* Confirm delete overlay */}
      {confirmDelete && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
          <div className="bg-[var(--color-bg-surface)] rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <p className="text-sm text-[var(--color-text)] mb-4">{t('notebooks.confirmDelete')}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                className="bg-red-500 hover:bg-red-600 text-white"
                isLoading={deleting}
                onClick={handleDeleteNotebook}
              >
                {t('notebooks.deleteNotebook')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Edit notebook modal ───────────────────────────────────

function EditNotebookModal({
  notebook,
  onClose,
  onSaved,
}: {
  notebook: NotebookResponse
  onClose: () => void
  onSaved: (nb: NotebookResponse) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(notebook.name)
  const [desc, setDesc] = useState(notebook.description ?? '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const { data } = await api.patch<NotebookResponse>(`/notebooks/${notebook.id}`, {
        name: name.trim(),
        description: desc.trim() || null,
      })
      onSaved(data)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed top-14 inset-x-0 bottom-0 z-[39] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-[var(--color-bg-surface)] rounded-xl shadow-2xl p-5 flex flex-col gap-4"
      >
        <h3 className="text-sm font-semibold text-[var(--color-text)]">{t('notebooks.editTitle')}</h3>
        <Input
          id="edit-nb-name"
          label={t('notebooks.nameLabel')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <Input
          id="edit-nb-desc"
          label={t('notebooks.descLabel')}
          value={desc}
          onChange={(e) => setDesc(e.target.value.slice(0, 150))}
          maxLength={150}
        />
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={saving}
            disabled={!name.trim()}
          >
            {saving ? t('notebooks.saving') : t('notebooks.save')}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ── Create notebook form ──────────────────────────────────

function CreateNotebookForm({
  isAdmin,
  onCreated,
  onCancel,
}: {
  isAdmin: boolean
  onCreated: (nb: NotebookResponse) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [type, setType] = useState<'private' | 'global'>('private')
  const [creating, setCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      const { data } = await api.post<NotebookResponse>('/notebooks', {
        name: name.trim(),
        description: desc.trim() || null,
        type,
      })
      onCreated(data)
    } finally {
      setCreating(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-bg-subtle)] flex flex-col gap-3"
    >
      <h3 className="text-sm font-semibold text-[var(--color-text)]">{t('notebooks.createTitle')}</h3>
      <Input
        id="nb-name"
        label={t('notebooks.nameLabel')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="vd: Từ vựng HSK3"
        autoFocus
      />
      <Input
        id="nb-desc"
        label={t('notebooks.descLabel')}
        value={desc}
        onChange={(e) => setDesc(e.target.value.slice(0, 150))}
        maxLength={150}
        placeholder="vd: Các từ cần ôn tập"
      />
      {isAdmin && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text)]">{t('notebooks.typeLabel')}</label>
          <Select
            value={type}
            options={[
              { value: 'private', label: t('notebooks.typePrivate') },
              { value: 'global', label: t('notebooks.typeGlobal') },
            ]}
            onChange={(v) => setType(v as 'private' | 'global')}
          />
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" size="sm" isLoading={creating} disabled={!name.trim()}>
          {creating ? t('notebooks.creating') : t('notebooks.create')}
        </Button>
      </div>
    </form>
  )
}

// ── Notebook card ─────────────────────────────────────────

const GRID_COLS = 4
const MAX_VISIBLE_ROWS = 2
const MAX_VISIBLE = GRID_COLS * MAX_VISIBLE_ROWS

function NotebookCard({
  notebook,
  canEdit,
  onClick,
  onEdit,
}: {
  notebook: NotebookResponse
  canEdit: boolean
  onClick: () => void
  onEdit?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      className="w-full text-left flex flex-col gap-1 px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-1.5">
        <p className="text-sm font-semibold text-[var(--color-text)] truncate">{notebook.name}</p>
        <div className="flex items-center gap-1 shrink-0">
          {canEdit && onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              title={t('notebooks.editNotebook')}
            >
              <Pencil size={11} />
            </button>
          )}
        </div>
      </div>
      {notebook.description && (
        <p className="text-xs text-[var(--color-text-muted)] truncate">{notebook.description}</p>
      )}
      <p className="text-xs text-[var(--color-text-muted)]">
        {notebook.entry_count} {t('notebooks.entries')}
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────

export function NotebooksPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const notebookVersion = useNotebookStore((s) => s.version)
  const [notebooks, setNotebooks] = useState<NotebookResponse[]>([])
  const [sort, setSort] = useState<NotebookSortOrder>('updated_at_desc')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const { openNotebook, setOpenNotebook } = useUIStore()
  const [editingNotebook, setEditingNotebook] = useState<NotebookResponse | null>(null)
  const [globalExpanded, setGlobalExpanded] = useState(false)
  const [privateExpanded, setPrivateExpanded] = useState(false)

  const fetchNotebooks = useCallback(async (s: NotebookSortOrder) => {
    setLoading(true)
    try {
      const { data } = await api.get<NotebookResponse[]>('/notebooks', { params: { sort: s } })
      setNotebooks(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotebooks(sort)
  }, [fetchNotebooks, sort, notebookVersion])

  const handleCreated = (nb: NotebookResponse) => {
    setNotebooks((prev) => [nb, ...prev])
    setShowCreate(false)
  }

  const handleNotebookSaved = (updated: NotebookResponse) => {
    setNotebooks((prev) => prev.map((n) => n.id === updated.id ? updated : n))
    setOpenNotebook((prev) => prev?.id === updated.id ? updated : prev)
  }

  const globalNotebooks = notebooks.filter((n) => n.type === 'global')
  const privateNotebooks = notebooks.filter((n) => n.type === 'private')

  const canEdit = (nb: NotebookResponse) => {
    if (nb.type === 'global') return user?.is_admin ?? false
    return nb.owner_id === user?.id
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{t('notebooks.title')}</h1>
        <div className="flex items-center gap-2">
          <Select
            align="right"
            value={sort}
            options={SORT_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
            onChange={setSort}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-1.5"
          >
            <Plus size={14} />
            {t('notebooks.createNew')}
          </Button>
        </div>
      </div>

      {showCreate && (
        <CreateNotebookForm
          isAdmin={user?.is_admin ?? false}
          onCreated={handleCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t('common.loading')}</p>
      ) : (
        <>
          {/* Global notebooks */}
          {globalNotebooks.length > 0 && (
            <section className="flex flex-col gap-3">
              <button
                title={`${t('common.expand')} / ${t('common.collapse')}`}
                onClick={() => setGlobalExpanded((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider hover:text-[var(--color-text)] transition-colors w-fit"
              >
                {t('notebooks.globalSection')} ({globalNotebooks.length})
                <ChevronDown
                  size={12}
                  className={cn('transition-transform duration-200', globalExpanded && 'rotate-180')}
                />
              </button>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(globalExpanded ? globalNotebooks : globalNotebooks.slice(0, MAX_VISIBLE)).map((nb) => (
                  <NotebookCard
                    key={nb.id}
                    notebook={nb}
                    canEdit={canEdit(nb)}
                    onClick={() => setOpenNotebook(nb)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Private notebooks */}
          <section className="flex flex-col gap-3">
            <button
              title={`${t('common.expand')} / ${t('common.collapse')}`}
              onClick={() => setPrivateExpanded((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider hover:text-[var(--color-text)] transition-colors w-fit"
            >
              {t('notebooks.privateSection')} ({privateNotebooks.length})
              {privateNotebooks.length > MAX_VISIBLE && (
                <ChevronDown
                  size={12}
                  className={cn('transition-transform duration-200', privateExpanded && 'rotate-180')}
                />
              )}
            </button>
            {privateNotebooks.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">{t('notebooks.empty')}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(privateExpanded ? privateNotebooks : privateNotebooks.slice(0, MAX_VISIBLE)).map((nb) => (
                  <NotebookCard
                    key={nb.id}
                    notebook={nb}
                    canEdit={canEdit(nb)}
                    onClick={() => setOpenNotebook(nb)}
                    onEdit={canEdit(nb) ? () => setEditingNotebook(nb) : undefined}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {openNotebook && (
        <NotebookEntriesModal
          notebook={openNotebook}
          canEdit={canEdit(openNotebook)}
          onClose={() => setOpenNotebook(null)}
          onDeleted={() => {
            setNotebooks((prev) => prev.filter((n) => n.id !== openNotebook.id))
          }}
          onEdit={canEdit(openNotebook) ? () => setEditingNotebook(openNotebook) : undefined}
        />
      )}

      {editingNotebook && (
        <EditNotebookModal
          notebook={editingNotebook}
          onClose={() => setEditingNotebook(null)}
          onSaved={handleNotebookSaved}
        />
      )}
    </div>
  )
}
