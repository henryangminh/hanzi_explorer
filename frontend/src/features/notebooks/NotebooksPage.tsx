import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, X, ChevronDown, ChevronLeft } from 'lucide-react'
import api from '@/lib/axios'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/auth.store'
import { CvdictSection } from '@/features/dictionary/CvdictSection'
import type { DictLiteResponse, NotebookEntryPreview, NotebookResponse, NotebookSortOrder } from '@/types'

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
}: {
  notebook: NotebookResponse
  canEdit: boolean
  onClose: () => void
  onDeleted: () => void
}) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<NotebookEntryPreview[]>([])
  const [sort, setSort] = useState<NotebookSortOrder>('updated_at_desc')
  const [loading, setLoading] = useState(true)
  const [removingChar, setRemovingChar] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // inline detail view
  const [selectedChar, setSelectedChar] = useState<string | null>(null)
  const [charDetail, setCharDetail] = useState<DictLiteResponse | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const fetchEntries = useCallback(async (s: NotebookSortOrder) => {
    setLoading(true)
    try {
      const { data } = await api.get<NotebookEntryPreview[]>(
        `/notebooks/${notebook.id}/entries/preview`,
        { params: { sort: s } }
      )
      setEntries(data)
    } finally {
      setLoading(false)
    }
  }, [notebook.id])

  useEffect(() => { fetchEntries(sort) }, [fetchEntries, sort])

  const handleSelectChar = async (char: string) => {
    if (selectedChar === char) {
      setSelectedChar(null)
      setCharDetail(null)
      return
    }
    setSelectedChar(char)
    setCharDetail(null)
    setLoadingDetail(true)
    try {
      const { data } = await api.get<DictLiteResponse>('/dictionary/lookup', { params: { q: char } })
      setCharDetail(data)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleRemoveEntry = async (entry: NotebookEntryPreview) => {
    setRemovingChar(entry.char)
    try {
      await api.delete(`/notebooks/${notebook.id}/entries/${encodeURIComponent(entry.char)}`)
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
      if (selectedChar === entry.char) { setSelectedChar(null); setCharDetail(null) }
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
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
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {entries.length} {t('notebooks.entries')}
            </p>
          </div>
          <div className="flex items-center gap-1 ml-3 shrink-0">
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
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as NotebookSortOrder)}
              className="text-xs px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
              ))}
            </select>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* ── Detail view ── */}
          {selectedChar ? (
            <div className="flex flex-col gap-4 pt-3">
              {/* Back */}
              <button
                onClick={() => { setSelectedChar(null); setCharDetail(null) }}
                className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors w-fit"
              >
                <ChevronLeft size={14} />
                {t('common.back')}
              </button>

              {loadingDetail ? (
                <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">{t('common.loading')}</p>
              ) : charDetail ? (
                <>
                  {/* Char header */}
                  <div className="flex items-baseline gap-2">
                    <span className="font-cjk text-3xl text-[var(--color-text)]">{charDetail.char}</span>
                    {charDetail.cedict[0]?.traditional && charDetail.cedict[0].traditional !== charDetail.char && (
                      <span className="font-cjk text-3xl leading-none text-[var(--color-text-muted)]">
                        ({charDetail.cedict[0].traditional})
                      </span>
                    )}
                    {charDetail.cedict[0] && (
                      <span className="text-sm text-[var(--color-text-muted)]">{charDetail.cedict[0].pinyin}</span>
                    )}
                  </div>

                  {/* CC-CEDICT */}
                  {charDetail.cedict.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                        {t('dictionary.cedict')}
                      </p>
                      <div className="flex flex-col gap-3">
                        {charDetail.cedict.map((ce, idx) => (
                          <div key={ce.id} className={cn(
                            'flex flex-col gap-1 pl-3',
                            charDetail.cedict.length > 1 && 'border-l-2 border-[var(--color-border-md)]'
                          )}>
                            <div className="flex items-center gap-2 flex-wrap">
                              {charDetail.cedict.length > 1 && (
                                <span className="text-xs font-medium text-[var(--color-primary)]">#{idx + 1}</span>
                              )}
                              <span className="font-medium text-[var(--color-text)]">{ce.pinyin}</span>
                              {ce.traditional && (
                                <span className="text-xs text-[var(--color-text-muted)]">
                                  繁: <span className="font-cjk">{ce.traditional}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[var(--color-text-muted)]">{ce.meaning_en}</p>
                            <div className="flex flex-wrap gap-2 mt-0.5">
                              {ce.radical && (
                                <span className="text-xs text-[var(--color-text-muted)]">
                                  {t('dictionary.radical')}: <span className="font-cjk">{ce.radical}</span>
                                </span>
                              )}
                              {ce.hsk_level && (
                                <span className="text-xs bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-full text-[var(--color-primary)]">
                                  HSK {ce.hsk_level}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CVDICT */}
                  {charDetail.cvdict && charDetail.cvdict.length > 0 && (
                    <CvdictSection entries={charDetail.cvdict} />
                  )}
                </>
              ) : null}
            </div>
          ) : (
            /* ── Grid view ── */
            loading ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-8">{t('common.loading')}</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-8">{t('notebooks.emptyEntries')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => handleSelectChar(entry.char)}
                    className="text-left flex flex-col gap-1 px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] hover:border-[var(--color-primary)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-cjk text-2xl text-[var(--color-text)]">{entry.char}</span>
                      {canEdit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveEntry(entry) }}
                          disabled={removingChar === entry.char}
                          className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-red-400 transition-colors disabled:opacity-40 shrink-0 mt-0.5"
                          title={t('notebooks.removeEntry')}
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                    {entry.pinyins.length > 0 && (
                      <p className="text-xs text-[var(--color-text-muted)] leading-tight">
                        {entry.pinyins.join(', ')}
                      </p>
                    )}
                    {entry.cedict_brief && (
                      <p className="text-xs text-[var(--color-text-muted)] line-clamp-1 leading-tight">
                        {entry.cedict_brief}
                      </p>
                    )}
                    {entry.cvdict_brief && (
                      <p className="text-xs text-[var(--color-primary)] line-clamp-1 leading-tight">
                        {entry.cvdict_brief}
                      </p>
                    )}
                  </button>
                ))}
              </div>
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
        onChange={(e) => setDesc(e.target.value)}
        placeholder="vd: Các từ cần ôn tập"
      />
      {isAdmin && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text)]">{t('notebooks.typeLabel')}</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'private' | 'global')}
            className="px-3 py-2 rounded-lg text-sm border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text)] outline-none"
          >
            <option value="private">{t('notebooks.typePrivate')}</option>
            <option value="global">{t('notebooks.typeGlobal')}</option>
          </select>
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
}: {
  notebook: NotebookResponse
  canEdit: boolean
  onClick: () => void
}) {
  const { t } = useTranslation()
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex flex-col gap-1 px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
    >
      <div className="flex items-start justify-between gap-1.5">
        <p className="text-sm font-semibold text-[var(--color-text)] truncate">{notebook.name}</p>
        {canEdit && (
          <span className="shrink-0 text-[10px] text-[var(--color-text-muted)] border border-[var(--color-border)] rounded px-1 py-0.5 leading-none">
            {t('notebooks.typePrivate')}
          </span>
        )}
      </div>
      {notebook.description && (
        <p className="text-xs text-[var(--color-text-muted)] truncate">{notebook.description}</p>
      )}
      <p className="text-xs text-[var(--color-text-muted)]">
        {notebook.entry_count} {t('notebooks.entries')}
      </p>
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────

export function NotebooksPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [notebooks, setNotebooks] = useState<NotebookResponse[]>([])
  const [sort, setSort] = useState<NotebookSortOrder>('updated_at_desc')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [openNotebook, setOpenNotebook] = useState<NotebookResponse | null>(null)
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
  }, [fetchNotebooks, sort])

  const handleCreated = (nb: NotebookResponse) => {
    setNotebooks((prev) => [nb, ...prev])
    setShowCreate(false)
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
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as NotebookSortOrder)}
            className="text-xs px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
            ))}
          </select>
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
        />
      )}
    </div>
  )
}
