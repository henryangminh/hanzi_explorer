/**
 * CharDetailPanel — shared component dùng cho mọi nơi hiển thị chi tiết 1 chữ.
 *
 * Nhận `char` (string) hoặc `entry` (DictionaryResponse / DictLiteResponse) sẵn có.
 * Tự động:
 *   1. Hiển thị dữ liệu DB (CEDICT, CVDICT, Hán Việt) ngay lập tức từ `initialEntry` nếu có.
 *   2. Gọi /dictionary/full/{char} để lấy dữ liệu Wiktionary (lazy, có cache phía server).
 *   3. Hiển thị spinner "Đang load thêm dữ liệu..." ở chỗ Wiktionary trong khi chờ.
 *   4. Khi Wiktionary về → render section. Nếu không có → ẩn đi, không để lại dấu vết.
 *
 * Props:
 *   char           — chữ cần tra (bắt buộc)
 *   initialEntry   — dữ liệu lite/full sẵn có (DictLiteResponse hoặc DictionaryResponse)
 *                    nếu bỏ qua, component sẽ tự fetch từ /dictionary/full/{char}
 *   showNotes      — hiện section "Ghi chú của tôi" (chỉ dùng ở Tra từ). Mặc định false.
 *   onNoteSaved    — callback khi lưu/xoá ghi chú thành công
 */
import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Minus, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { DictionarySectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DictionaryList } from './DictionaryList'
import api from '@/lib/axios'
import type { DictionaryResponse, DictLiteResponse, UserNoteResponse, XdhyEntry } from '@/types'

// DictLiteResponse also has char/cedict/cvdict/sino_vn. We accept both.
type InitialEntry = DictLiteResponse | DictionaryResponse

// Group consecutive definitions that share the same part-of-speech
type PosGroup = { pos: string | null; defs: XdhyEntry['defs'] }
function groupDefsByPos(defs: XdhyEntry['defs']): PosGroup[] {
  return defs.reduce<PosGroup[]>((groups, d) => {
    const last = groups[groups.length - 1]
    if (last && last.pos === d.pos) {
      last.defs.push(d)
    } else {
      groups.push({ pos: d.pos, defs: [d] })
    }
    return groups
  }, [])
}

function isFullEntry(e: InitialEntry): e is DictionaryResponse {
  return 'external' in e
}

function SectionHeader({
  children,
  collapsed,
  onToggle,
  className,
}: {
  children: React.ReactNode
  collapsed: boolean
  onToggle: () => void
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <DictionarySectionTitle>{children}</DictionarySectionTitle>
      <button
        onClick={onToggle}
        className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
        title={collapsed ? t('common.expand') : t('common.collapse')}
      >
        {collapsed ? <Plus size={14} /> : <Minus size={14} />}
      </button>
    </div>
  )
}

interface Props {
  char: string
  initialEntry?: InitialEntry
  showNotes?: boolean
  onDataLoaded?: (entry: DictionaryResponse) => void
  onNoteSaved?: () => void
}

export function CharDetailPanel({ char, initialEntry, showNotes = false, onDataLoaded, onNoteSaved }: Props) {
  const { t } = useTranslation()

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggle = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))

  // Full entry (with Wiktionary). If initialEntry is already full, use it.
  const [full, setFull] = useState<DictionaryResponse | null>(
    initialEntry && isFullEntry(initialEntry) ? initialEntry : null
  )
  // Lite entry for immediate DB display when no initialEntry provided
  const [lite, setLite] = useState<DictLiteResponse | null>(
    initialEntry && !isFullEntry(initialEntry) ? initialEntry : null
  )
  const [loadingFull, setLoadingFull] = useState(!full)
  const fetchedRef = useRef(false)

  // Notes state
  const [notes, setNotes] = useState<UserNoteResponse[]>(
    initialEntry && isFullEntry(initialEntry) ? (initialEntry.user_notes ?? []) : []
  )
  // Add note form
  const [addingNote, setAddingNote] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDetail, setNewDetail] = useState('')
  const [savingNew, setSavingNew] = useState(false)
  // Edit note
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDetail, setEditDetail] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  // Delete note
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null)
  // Which note card is "selected" (shows detail panel below grid)
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null)
  const detailPanelRef = useRef<HTMLDivElement>(null)
  const prevSelectedRef = useRef<number | null>(null)

  // After a new note is selected, scroll the detail panel into view with minimal movement
  useLayoutEffect(() => {
    if (selectedNoteId !== null && selectedNoteId !== prevSelectedRef.current) {
      detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    prevSelectedRef.current = selectedNoteId
  }, [selectedNoteId])

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    // Already have a full entry — nothing to do
    if (full) {
      setLoadingFull(false)
      return
    }

    const run = async () => {
      // Phase 1 (only when no initialEntry): fetch lite immediately so DB data
      // shows right away while Wiktionary is still loading in phase 2.
      if (!initialEntry) {
        try {
          const { data } = await api.get<DictLiteResponse>(
            `/dictionary/lookup?q=${encodeURIComponent(char)}`
          )
          setLite(data)
        } catch {
          // ignore — full fetch below will cover it
        }
      }

      // Phase 2: fetch full entry (DB + Wiktionary, uses server-side cache)
      setLoadingFull(true)
      try {
        const { data } = await api.get<DictionaryResponse>(
          `/dictionary/full/${encodeURIComponent(char)}`
        )
        setFull(data)
        setLite(null) // full supersedes lite
        onDataLoaded?.(data)
        setNotes(data.user_notes ?? [])
      } catch {
        // silently fail — lite data (if fetched) stays visible
      } finally {
        setLoadingFull(false)
      }
    }

    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char])

  // When full entry arrives (e.g. passed from parent after search), sync notes
  useEffect(() => {
    if (full?.user_notes) {
      setNotes(full.user_notes)
    }
  }, [full?.user_notes])

  // ── Notes handlers ────────────────────────────────────────

  const handleAddNote = async () => {
    if (!newTitle.trim()) return
    setSavingNew(true)
    try {
      const { data } = await api.post<UserNoteResponse>(
        `/dictionary/${encodeURIComponent(char)}/notes`,
        { title: newTitle.trim(), detail: newDetail.trim() || null }
      )
      setNotes((prev) => [...prev, data])
      setNewTitle('')
      setNewDetail('')
      setAddingNote(false)
      onNoteSaved?.()
    } finally {
      setSavingNew(false)
    }
  }

  const handleStartEdit = (note: UserNoteResponse) => {
    setEditingNoteId(note.id)
    setEditTitle(note.title)
    setEditDetail(note.detail ?? '')
    setSelectedNoteId(null)
  }

  const handleCancelEdit = () => {
    // Re-select the note so detail panel re-appears after cancel
    setSelectedNoteId(editingNoteId)
    setEditingNoteId(null)
    setEditTitle('')
    setEditDetail('')
  }

  const handleSaveEdit = async (noteId: number) => {
    if (!editTitle.trim()) return
    setSavingEdit(true)
    try {
      const { data } = await api.put<UserNoteResponse>(
        `/dictionary/${encodeURIComponent(char)}/notes/${noteId}`,
        { title: editTitle.trim(), detail: editDetail.trim() || null }
      )
      setNotes((prev) => prev.map((n) => (n.id === noteId ? data : n)))
      setEditingNoteId(null)
      setSelectedNoteId(noteId)
      onNoteSaved?.()
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    setDeletingNoteId(noteId)
    try {
      await api.delete(`/dictionary/${encodeURIComponent(char)}/notes/${noteId}`)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
      if (selectedNoteId === noteId) setSelectedNoteId(null)
      onNoteSaved?.()
    } finally {
      setDeletingNoteId(null)
    }
  }

  // Resolve the current display source: full → lite (phase-1 fetch or prop) → null
  const liteSource = lite // set either from prop (initialEntry lite) or phase-1 fetch
  const entry = full ?? (liteSource
    ? {
        char: liteSource.char,
        cedict: liteSource.cedict,
        cvdict: liteSource.cvdict,
        xdhy: liteSource.xdhy ?? [],
        sino_vn: liteSource.sino_vn,
        external: [],
        user_notes: [],
        hsk_tags: liteSource.hsk_tags ?? [],
        hanzipy: null,
      } satisfies DictionaryResponse
    : null)

  // If no data at all yet (lite not fetched, full not fetched), show a spinner
  if (!entry) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-[var(--color-text-muted)]">
        <Loader2 size={14} className="animate-spin shrink-0" />
        <span>{t('common.loading')}</span>
      </div>
    )
  }


  const hskTags = full?.hsk_tags ?? []

  return (
    <div className="flex flex-col gap-4">
      {/* Char display: simplified (traditional) */}
      {entry.cedict[0] && (
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-cjk text-3xl text-[var(--color-text)] leading-none">{entry.char}</span>
          {entry.cedict[0].traditional && entry.cedict[0].traditional !== entry.char && (
            <span className="font-cjk text-3xl text-[var(--color-text-muted)] leading-none">({entry.cedict[0].traditional})</span>
          )}
        </div>
      )}

      {/* HSK tags */}
      {hskTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {hskTags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-[var(--color-primary)] font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {entry.cedict[0] && (entry.cedict[0].radical || entry.cedict[0].stroke_count) && (
        <div className="flex flex-wrap gap-3">
          {entry.cedict[0].radical && (
            <span className="text-sm text-[var(--color-text-muted)]">
              {t('dictionary.radical')}: <span className="font-cjk font-medium text-[var(--color-text)]">{entry.cedict[0].radical}</span>
            </span>
          )}
          {entry.cedict[0].stroke_count && (
            <span className="text-sm text-[var(--color-text-muted)]">
              {t('dictionary.strokes')}: <span className="font-medium text-[var(--color-text)]">{entry.cedict[0].stroke_count}</span>
            </span>
          )}
        </div>
      )}


      {/* CC-CEDICT */}
      {entry.cedict.length > 0 ? (
        <div>
          <SectionHeader collapsed={!!collapsed['cedict']} onToggle={() => toggle('cedict')} className="mb-2">
            {t('dictionary.cedict')}
          </SectionHeader>
          {!collapsed['cedict'] && (
            <div className="pl-4">
              <DictionaryList
                entries={entry.cedict}
                renderMeaning={(ce) => (
                  <p className="text-sm text-[var(--color-text-muted)]">{ce.meaning_en}</p>
                )}
              />
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)] italic">{t('dictionary.noResult')}</p>
      )}

      {/* CVDICT */}
      {entry.cvdict?.length > 0 && (
        <div>
          <SectionHeader collapsed={!!collapsed['cvdict']} onToggle={() => toggle('cvdict')} className="mb-2">
            {t('dictionary.cvdict')}
          </SectionHeader>
          {!collapsed['cvdict'] && (
            <div className="pl-4">
              <DictionaryList
                entries={entry.cvdict}
                renderMeaning={(cv) => (
                  <>
                    {cv.meaning_vi.split('/').filter(Boolean).map((meaning, i) => {
                      const parts = cv.meaning_vi.split('/').filter(Boolean)
                      return (
                        <p key={i} className="text-sm text-[var(--color-text-muted)]">
                          {parts.length > 1 ? (
                            <><span className="text-xs text-[var(--color-primary)] mr-1">{i + 1}.</span>{meaning.trim()}</>
                          ) : meaning.trim()}
                        </p>
                      )
                    })}
                  </>
                )}
              />
            </div>
          )}
        </div>
      )}

      {/* 现代汉语词典 */}
      {entry.xdhy?.length > 0 && (
        <div>
          <SectionHeader collapsed={!!collapsed['xdhy']} onToggle={() => toggle('xdhy')} className="mb-2">
            {t('dictionary.xdhy')}
          </SectionHeader>
          {!collapsed['xdhy'] && <div className="pl-4 flex flex-col gap-3">
            {entry.xdhy.map((xEntry: XdhyEntry) => {
              const groups = groupDefsByPos(xEntry.defs)
              return (
                <div
                  key={xEntry.id}
                  className={cn(
                    'flex flex-col gap-1',
                    entry.xdhy.length > 1 && 'pl-3 border-l-2 border-[var(--color-border-md)]'
                  )}
                >
                  <span className="font-medium text-[var(--color-text)]">{xEntry.pinyin}</span>
                  <div className="flex flex-col gap-2">
                    {groups.map((group, gi) => (
                      <div key={gi}>
                        {group.pos && (
                          <span className="inline-block text-sm font-medium text-[var(--color-primary)] border border-[var(--color-primary)] rounded px-1.5 py-0.5 mb-1">
                            {group.pos}
                          </span>
                        )}
                        <div className="flex flex-col gap-1">
                          {(() => {
                            let numCount = 0
                            return group.defs.map((d, idx) => {
                              const subMatch = d.is_sub ? d.definition.match(/^([a-z])）(.*)/) : null
                              const subLetter = subMatch?.[1]
                              const defText = subMatch ? subMatch[2].trim() : d.definition
                              if (!d.is_sub) numCount++
                              return (
                                <div key={idx} className={d.is_sub ? 'ml-4' : ''}>
                                  <div className="flex gap-1.5 text-sm text-[var(--color-text)]">
                                    <span className="shrink-0 text-[var(--color-text-muted)]">
                                      {d.is_sub ? `${subLetter}）` : `${numCount}.`}
                                    </span>
                                    <span>{defText}</span>
                                  </div>
                                  {d.examples.map((ex, j) => (
                                    <div key={j} className={cn('text-sm italic', d.is_sub ? 'ml-8' : 'ml-4')} style={{ color: 'var(--color-accent)' }}>
                                      → {ex}
                                    </div>
                                  ))}
                                </div>
                              )
                            })
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>}
        </div>
      )}

      {/* Wiktionary — loading placeholder */}
      {loadingFull && (
        <div className="flex items-center gap-2 py-1 text-sm text-[var(--color-text-muted)]">
          <Loader2 size={13} className="animate-spin shrink-0" />
          <span>{t('dictionary.loadingMore')}</span>
        </div>
      )}

      {/* Wiktionary — actual data (only shown when full entry arrives) */}
      {!loadingFull && full?.external?.map((src) => {
        const d = src.data as {
          found?: boolean
          sections?: { part_of_speech: string; definitions: string[] }[]
        }
        if (!d.found) return null
        return (
          <div key={src.source}>
            <SectionHeader collapsed={!!collapsed[src.source]} onToggle={() => toggle(src.source)} className="mb-2">
              {src.label}
            </SectionHeader>
            {!collapsed[src.source] && (
              <div className="pl-4 flex flex-col gap-2">
                {d.sections?.map((sec, i) => (
                  <div key={i}>
                    {sec.part_of_speech && (
                      <span className="inline-block text-sm font-medium text-[var(--color-primary)] border border-[var(--color-primary)] rounded px-1.5 py-0.5 mb-1">
                        {sec.part_of_speech}
                      </span>
                    )}
                    <div className="mt-1 flex flex-col gap-1">
                      {(() => {
                        let count = 0
                        return sec.definitions.map((def, j) => {
                          const isExample = def.startsWith('→')
                          if (!isExample) count++
                          return isExample ? (
                            <div key={j} className="ml-4 text-sm italic" style={{ color: 'var(--color-accent)' }}>
                              {def}
                            </div>
                          ) : (
                            <div key={j} className="flex gap-1.5 text-sm text-[var(--color-text)]">
                              <span className="shrink-0 text-[var(--color-text-muted)]">{count}.</span>
                              <span>{def}</span>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Notes — only shown when showNotes=true (Tra từ feature) */}
      {showNotes && (
        <div>
          <SectionHeader collapsed={!!collapsed['notes']} onToggle={() => toggle('notes')} className="mb-2">
            {t('dictionary.notes')}
          </SectionHeader>
          {!collapsed['notes'] && (
            <div className="flex flex-col gap-2">
              {/* Notes grid: 3 cols on desktop, 1 col on mobile. Cards always truncated. */}
              {notes.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className={cn(
                        'flex flex-col gap-1 p-3 rounded-lg border cursor-pointer transition-colors min-w-0',
                        selectedNoteId === note.id
                          ? 'border-[var(--color-primary)] bg-[var(--color-bg-subtle)]'
                          : 'border-[var(--color-border)] bg-[var(--color-bg-subtle)] hover:border-[var(--color-primary)]'
                      )}
                      onClick={() => {
                        setSelectedNoteId(selectedNoteId === note.id ? null : note.id)
                        setEditingNoteId(null)
                        setAddingNote(false)
                      }}
                    >
                      <p className="text-sm font-semibold text-[var(--color-text)] line-clamp-1 break-words min-w-0">
                        {note.title}
                      </p>
                      {note.detail && (
                        <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 break-words min-w-0">
                          {note.detail}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Detail panel — full width, shown below grid when a card is selected */}
              {selectedNoteId !== null && editingNoteId === null && (() => {
                const note = notes.find((n) => n.id === selectedNoteId)
                if (!note) return null
                return (
                  <div ref={detailPanelRef} className="w-full flex flex-col gap-2 p-3 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg-subtle)] min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text)] break-words min-w-0">
                      {note.title}
                    </p>
                    {note.detail && (
                      <p className="text-sm text-[var(--color-text-muted)] break-words whitespace-pre-wrap min-w-0">
                        {note.detail}
                      </p>
                    )}
                    <div className="flex gap-2 mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1"
                        onClick={() => handleStartEdit(note)}
                      >
                        <Pencil size={12} />
                        {t('dictionary.editNote')}
                      </Button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={deletingNoteId === note.id}
                        className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                        title={t('dictionary.deleteNote')}
                      >
                        {deletingNoteId === note.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Trash2 size={13} />
                        }
                      </button>
                    </div>
                  </div>
                )
              })()}

              {/* Edit form — full width, replaces detail panel */}
              {editingNoteId !== null && (() => {
                return (
                  <div className="w-full flex flex-col gap-2 p-3 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg-subtle)]">
                    <div className="flex flex-col gap-1.5">
                      <Input
                        id={`edit-title-${editingNoteId}`}
                        label={t('dictionary.noteTitle')}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value.slice(0, 50))}
                        placeholder={t('dictionary.noteTitlePlaceholder')}
                        autoFocus
                        maxLength={50}
                      />
                      <span className="text-xs text-[var(--color-text-muted)] text-right">
                        {t('dictionary.charCount', { current: editTitle.length, max: 50 })}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-[var(--color-text)]">
                        {t('dictionary.noteDetail')}
                      </label>
                      <textarea
                        value={editDetail}
                        onChange={(e) => setEditDetail(e.target.value.slice(0, 250))}
                        placeholder={t('dictionary.noteDetailPlaceholder')}
                        rows={3}
                        maxLength={250}
                        className={cn(
                          'w-full px-3 py-2 rounded-lg text-sm resize-none',
                          'bg-[var(--color-bg-surface)] text-[var(--color-text)]',
                          'border border-[var(--color-border)] focus:border-[var(--color-primary)]',
                          'outline-none transition-colors placeholder:text-[var(--color-text-muted)]'
                        )}
                      />
                      <span className="text-xs text-[var(--color-text-muted)] text-right">
                        {t('dictionary.charCount', { current: editDetail.length, max: 250 })}
                      </span>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        {t('common.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(editingNoteId)}
                        isLoading={savingEdit}
                        disabled={!editTitle.trim()}
                      >
                        {savingEdit ? t('dictionary.saving') : t('dictionary.save')}
                      </Button>
                    </div>
                  </div>
                )
              })()}

              {/* Add note form */}
              {addingNote ? (
                <div className="flex flex-col gap-2 p-3 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg-subtle)]">
                  <div className="flex flex-col gap-1.5">
                    <Input
                      id={`new-title-${char}`}
                      label={t('dictionary.noteTitle')}
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value.slice(0, 50))}
                      placeholder={t('dictionary.noteTitlePlaceholder')}
                      autoFocus
                      maxLength={50}
                    />
                    <span className="text-xs text-[var(--color-text-muted)] text-right">
                      {t('dictionary.charCount', { current: newTitle.length, max: 50 })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[var(--color-text)]">
                      {t('dictionary.noteDetail')}
                    </label>
                    <textarea
                      value={newDetail}
                      onChange={(e) => setNewDetail(e.target.value.slice(0, 250))}
                      placeholder={t('dictionary.noteDetailPlaceholder')}
                      rows={3}
                      maxLength={250}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg text-sm resize-none',
                        'bg-[var(--color-bg-surface)] text-[var(--color-text)]',
                        'border border-[var(--color-border)] focus:border-[var(--color-primary)]',
                        'outline-none transition-colors placeholder:text-[var(--color-text-muted)]'
                      )}
                    />
                    <span className="text-xs text-[var(--color-text-muted)] text-right">
                      {t('dictionary.charCount', { current: newDetail.length, max: 250 })}
                    </span>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => { setAddingNote(false); setNewTitle(''); setNewDetail('') }}>
                      {t('common.cancel')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      isLoading={savingNew}
                      disabled={!newTitle.trim()}
                    >
                      {savingNew ? t('dictionary.saving') : t('dictionary.save')}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="self-start flex items-center gap-1.5"
                  onClick={() => { setAddingNote(true); setSelectedNoteId(null); setEditingNoteId(null) }}
                >
                  <Plus size={13} />
                  {t('dictionary.addNote')}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
