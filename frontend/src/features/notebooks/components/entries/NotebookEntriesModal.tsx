import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { notebooksApi } from '@/api/notebooksApi'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StreamingIndicator } from '@/components/ui/LoadingDots'
import { ModalOverlay } from '@/components/ui/ModalOverlay'
import { Select } from '@/components/ui/Select'
import { useUIStore } from '@/store/ui.store'
import type { NotebookEntryPreview, NotebookResponse, NotebookSortOrder } from '@/types'
import { SaveToNotebookModal } from '@/features/shared/SaveToNotebookModal'
import { useEntryStatuses } from '../../hooks/useEntryStatuses'
import { useNotebookEntries } from '../../hooks/useNotebookEntries'
import { sortOptions } from '../../sortOptions'
import { AddEntriesForm } from './AddEntriesForm'
import { EntriesHeader } from './EntriesHeader'
import { EntryDetailView } from './EntryDetailView'
import { EntryGrid } from './EntryGrid'
import { EntryStatusFilter } from './EntryStatusFilter'
import { ALL_ENTRY_FILTERS, filterEntries, type EntryFilter } from './entryFilter'

interface NotebookEntriesModalProps {
  notebook: NotebookResponse
  canEdit: boolean
  onClose: () => void
  onDeleted: () => void
  onEdit?: () => void
  onCountsChanged?: (learned: number, notLearned: number) => void
  /** Show a form to add many words at once; called after words were added. */
  onEntriesAdded?: () => void
  /** The learned / not learned marks and filter (off when managing a notebook rather than studying it). */
  showStatus?: boolean
}

/** A notebook's words: filterable, sortable grid, or one word in detail. */
export function NotebookEntriesModal({ notebook, canEdit, onClose, onDeleted, onEdit, onCountsChanged, onEntriesAdded, showStatus = true }: NotebookEntriesModalProps) {
  const { t } = useTranslation()
  const [sort, setSort] = useState<NotebookSortOrder>('updated_at_desc')
  const [filters, setFilters] = useState<Set<EntryFilter>>(new Set(ALL_ENTRY_FILTERS))
  const [entriesVersion, setEntriesVersion] = useState(0)
  const { entries, loading, removeLocal } = useNotebookEntries(notebook.id, sort, entriesVersion)
  const { statuses, setStatus } = useEntryStatuses(notebook.id, entries, loading, onCountsChanged, showStatus)
  const { selectedNotebookChar: selectedChar, setSelectedNotebookChar: setSelectedChar } = useUIStore()
  const [removingChar, setRemovingChar] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveModalChar, setSaveModalChar] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // The selected word belongs to this notebook: the next one opens on its word list
  function close() {
    setSelectedChar(null)
    onClose()
  }

  const visibleEntries = useMemo(() => filterEntries(entries, statuses, filters), [entries, statuses, filters])

  async function removeEntry(entry: NotebookEntryPreview) {
    setRemovingChar(entry.char)
    try {
      await notebooksApi.removeEntry(notebook.id, entry.char)
      removeLocal(entry.id)
      if (selectedChar === entry.char) setSelectedChar(null)
    } finally {
      setRemovingChar(null)
    }
  }

  async function deleteNotebook() {
    setDeleting(true)
    try {
      await notebooksApi.remove(notebook.id)
      onDeleted()
      close()
    } finally {
      setDeleting(false)
    }
  }

  function body() {
    if (selectedChar) {
      return <EntryDetailView char={selectedChar} onBack={() => setSelectedChar(null)} onSave={() => setSaveModalChar(selectedChar)} />
    }
    if (entries.length === 0) {
      return (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
          {loading ? t('common.loading') : t('notebooks.emptyEntries')}
        </p>
      )
    }
    return (
      <>
        <EntryGrid
          entries={visibleEntries}
          statuses={statuses}
          scrollElement={() => scrollRef.current}
          removable={canEdit}
          removingChar={removingChar}
          onSelect={(char) => setSelectedChar(selectedChar === char ? null : char)}
          onStatusChange={showStatus ? setStatus : undefined}
          onRemove={removeEntry}
        />
        {loading && <StreamingIndicator label={t('common.streamingLoading')} className="py-3" />}
      </>
    )
  }

  return (
    <ModalOverlay onClose={close} className="bg-black/60 p-4">
      <div className="w-full max-w-3xl h-full max-h-[90vh] bg-[var(--color-bg-surface)] rounded-2xl shadow-2xl flex flex-col">
        <EntriesHeader
          notebook={notebook}
          // While streaming, the notebook's own total — not a count ticking up as batches arrive
          shownCount={loading ? notebook.entry_count : visibleEntries.length}
          totalCount={loading ? notebook.entry_count : entries.length}
          statuses={statuses}
          onEdit={canEdit ? onEdit : undefined}
          onDelete={canEdit ? () => setConfirmDelete(true) : undefined}
          onClose={close}
        />

        {!selectedChar && onEntriesAdded && (
          <AddEntriesForm
            notebookId={notebook.id}
            onAdded={() => { setEntriesVersion((v) => v + 1); onEntriesAdded() }}
          />
        )}

        {!selectedChar && (
          <div className="px-6 py-2 shrink-0 flex items-center gap-2">
            <Select value={sort} options={sortOptions(t)} onChange={setSort} />
            {showStatus && <EntryStatusFilter selected={filters} onChange={setFilters} />}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-6" ref={scrollRef}>
          {saveModalChar && (
            <SaveToNotebookModal char={saveModalChar} excludeNotebookId={notebook.id} onClose={() => setSaveModalChar(null)} />
          )}
          {body()}
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message={t('notebooks.confirmDelete')}
          confirmLabel={t('notebooks.deleteNotebook')}
          loading={deleting}
          onConfirm={deleteNotebook}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </ModalOverlay>
  )
}
