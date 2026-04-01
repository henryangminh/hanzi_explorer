import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Plus, BookmarkPlus, Check, AlertCircle } from 'lucide-react'
import api from '@/lib/axios'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { NotebookResponse, NotebookSortOrder } from '@/types'

const SORT_OPTIONS: { value: NotebookSortOrder; labelKey: string }[] = [
  { value: 'updated_at_desc', labelKey: 'notebooks.sortUpdatedDesc' },
  { value: 'updated_at_asc', labelKey: 'notebooks.sortUpdatedAsc' },
  { value: 'name_asc', labelKey: 'notebooks.sortNameAsc' },
  { value: 'name_desc', labelKey: 'notebooks.sortNameDesc' },
  { value: 'created_at_desc', labelKey: 'notebooks.sortCreatedDesc' },
  { value: 'created_at_asc', labelKey: 'notebooks.sortCreatedAsc' },
]

interface Props {
  char: string
  onClose: () => void
}

export function SaveToNotebookModal({ char, onClose }: Props) {
  const { t } = useTranslation()
  const [notebooks, setNotebooks] = useState<NotebookResponse[]>([])
  const [sort, setSort] = useState<NotebookSortOrder>('updated_at_desc')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ id: number; type: 'ok' | 'dup' } | null>(null)

  // create form
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchNotebooks = async (s: NotebookSortOrder) => {
    setLoading(true)
    try {
      const { data } = await api.get<NotebookResponse[]>('/notebooks', { params: { sort: s } })
      setNotebooks(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotebooks(sort)
  }, [sort])

  const handleSave = async (notebook: NotebookResponse) => {
    setSavingId(notebook.id)
    setFeedback(null)
    try {
      await api.post(`/notebooks/${notebook.id}/entries`, { char })
      setFeedback({ id: notebook.id, type: 'ok' })
      // refresh entry count
      setNotebooks((prev) =>
        prev.map((n) => (n.id === notebook.id ? { ...n, entry_count: n.entry_count + 1 } : n))
      )
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setFeedback({ id: notebook.id, type: 'dup' })
      }
    } finally {
      setSavingId(null)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      await api.post('/notebooks', {
        name: newName.trim(),
        description: newDesc.trim() || null,
        type: 'private',
      })
      setNewName('')
      setNewDesc('')
      setShowCreate(false)
      await fetchNotebooks(sort)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-md mx-4 bg-[var(--color-bg-surface)] rounded-2xl shadow-xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              {t('notebooks.saveToNotebook')}
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] font-cjk mt-0.5">{char}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sort */}
        <div className="px-5 pb-2 shrink-0">
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

        {/* List */}
        <div className="overflow-y-auto flex-1 px-5 pb-2">
          {loading ? (
            <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">{t('common.loading')}</p>
          ) : notebooks.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">{t('notebooks.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {notebooks.map((nb) => {
                const fb = feedback?.id === nb.id ? feedback : null
                return (
                  <li key={nb.id}>
                    <button
                      onClick={() => handleSave(nb)}
                      disabled={savingId === nb.id || fb?.type === 'ok'}
                      className={cn(
                        'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left',
                        fb?.type === 'ok'
                          ? 'border-green-400/40 bg-green-50 dark:bg-green-900/20'
                          : fb?.type === 'dup'
                          ? 'border-orange-400/40 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)]'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text)] truncate">{nb.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          {nb.entry_count} {t('notebooks.entries')}
                          {nb.type === 'global' && (
                            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-primary)] text-[10px]">
                              {t('notebooks.typeGlobal')}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {savingId === nb.id ? (
                          <span className="text-xs text-[var(--color-text-muted)]">...</span>
                        ) : fb?.type === 'ok' ? (
                          <Check size={15} className="text-green-500" />
                        ) : fb?.type === 'dup' ? (
                          <AlertCircle size={15} className="text-orange-400" />
                        ) : (
                          <BookmarkPlus size={15} className="text-[var(--color-text-muted)]" />
                        )}
                      </div>
                    </button>
                    {fb?.type === 'dup' && (
                      <p className="text-xs text-orange-500 mt-0.5 px-1">
                        {t('notebooks.alreadyExists')} "{nb.name}"
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Create new */}
        <div className="px-5 pb-5 pt-3 border-t border-[var(--color-border)] shrink-0">
          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:opacity-80 transition-opacity"
            >
              <Plus size={15} />
              {t('notebooks.createNew')}
            </button>
          ) : (
            <form onSubmit={handleCreate} className="flex flex-col gap-2">
              <Input
                id="nb-name"
                label={t('notebooks.nameLabel')}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="vd: Từ vựng HSK3"
                autoFocus
              />
              <Input
                id="nb-desc"
                label={t('notebooks.descLabel')}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="vd: Các từ cần ôn tập"
              />
              <div className="flex gap-2 justify-end mt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowCreate(false); setNewName(''); setNewDesc('') }}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" size="sm" isLoading={creating} disabled={!newName.trim()}>
                  {creating ? t('notebooks.creating') : t('notebooks.create')}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
