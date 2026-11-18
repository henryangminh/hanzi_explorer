import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useNotebookStore } from '@/store/notebook.store'
import type { NotebookResponse } from '@/types'
import { CreateNotebookForm } from '@/features/notebooks/components/CreateNotebookForm'
import { EditNotebookModal } from '@/features/notebooks/components/EditNotebookModal'
import { NotebookEntriesModal } from '@/features/notebooks/components/entries/NotebookEntriesModal'
import { NotebookSection } from '@/features/notebooks/components/NotebookSection'
import { useNotebooks } from '@/features/notebooks/hooks/useNotebooks'

const canEdit = () => true

/** Global notebooks: create, rename, delete, and add or remove their words. */
export function AdminNotebooksPage() {
  const { t } = useTranslation()
  const notebooks = useNotebooks()
  const invalidate = useNotebookStore((s) => s.invalidate)
  const [showCreate, setShowCreate] = useState(false)
  const [openNotebook, setOpenNotebook] = useState<NotebookResponse | null>(null)
  const [editingNotebook, setEditingNotebook] = useState<NotebookResponse | null>(null)
  const globalNotebooks = notebooks.notebooks.filter((n) => n.type === 'global')

  function handleCreated(nb: NotebookResponse) {
    notebooks.add(nb)
    setShowCreate(false)
    setOpenNotebook(nb)
  }

  function handleSaved(nb: NotebookResponse) {
    notebooks.replace(nb)
    if (openNotebook?.id === nb.id) setOpenNotebook(nb)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">{t('admin.layout.notebooks')}</h1>
        <Button size="sm" onClick={() => setShowCreate((v) => !v)} className="flex items-center gap-1.5">
          <Plus size={14} />
          {t('notebooks.createNew')}
        </Button>
      </div>
      <p className="text-sm text-[var(--color-text-muted)] -mt-4">{t('admin.notebooks.subtitle')}</p>

      {showCreate && (
        <div className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-bg-subtle)] flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{t('notebooks.createTitle')}</h3>
          <CreateNotebookForm defaultType="global" onCreated={handleCreated} onCancel={() => setShowCreate(false)} />
        </div>
      )}

      {notebooks.loading && globalNotebooks.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t('common.loading')}</p>
      ) : (
        <NotebookSection
          title={t('notebooks.globalSection')}
          notebooks={globalNotebooks}
          emptyText={t('notebooks.empty')}
          collapsible={false}
          onOpen={setOpenNotebook}
          onEdit={setEditingNotebook}
          canEdit={canEdit}
        />
      )}

      {openNotebook && (
        <NotebookEntriesModal
          notebook={openNotebook}
          canEdit
          showStatus={false}
          onClose={() => setOpenNotebook(null)}
          onDeleted={() => notebooks.remove(openNotebook.id)}
          onEdit={() => setEditingNotebook(openNotebook)}
          onEntriesAdded={invalidate}
        />
      )}

      {editingNotebook && (
        <EditNotebookModal notebook={editingNotebook} onClose={() => setEditingNotebook(null)} onSaved={handleSaved} />
      )}
    </div>
  )
}
