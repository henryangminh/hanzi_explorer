import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useAuthStore } from '@/store/auth.store'
import { useUIStore } from '@/store/ui.store'
import type { NotebookResponse } from '@/types'
import { CreateNotebookForm } from './components/CreateNotebookForm'
import { EditNotebookModal } from './components/EditNotebookModal'
import { NotebookEntriesModal } from './components/entries/NotebookEntriesModal'
import { NotebookSection } from './components/NotebookSection'
import { useCanEditNotebook } from './hooks/useCanEditNotebook'
import { useNotebooks } from './hooks/useNotebooks'
import { sortOptions } from './sortOptions'

export function NotebooksPage() {
  const { t } = useTranslation()
  const isAdmin = useAuthStore((s) => s.user?.is_admin ?? false)
  const notebooks = useNotebooks()
  const canEdit = useCanEditNotebook()
  const { openNotebook, setOpenNotebook } = useUIStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editingNotebook, setEditingNotebook] = useState<NotebookResponse | null>(null)

  function handleCreated(nb: NotebookResponse) {
    notebooks.add(nb)
    setShowCreate(false)
  }

  function handleSaved(nb: NotebookResponse) {
    notebooks.replace(nb)
    if (openNotebook?.id === nb.id) setOpenNotebook(nb)
  }

  const globalNotebooks = notebooks.notebooks.filter((n) => n.type === 'global')
  const privateNotebooks = notebooks.notebooks.filter((n) => n.type === 'private')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{t('notebooks.title')}</h1>
        <div className="flex items-center gap-2">
          <Select align="right" value={notebooks.sort} options={sortOptions(t)} onChange={notebooks.setSort} />
          <Button size="sm" variant="outline" onClick={() => setShowCreate((v) => !v)} className="flex items-center gap-1.5">
            <Plus size={14} />
            {t('notebooks.createNew')}
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-bg-subtle)] flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{t('notebooks.createTitle')}</h3>
          <CreateNotebookForm allowGlobal={isAdmin} onCreated={handleCreated} onCancel={() => setShowCreate(false)} />
        </div>
      )}

      {notebooks.loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t('common.loading')}</p>
      ) : (
        <>
          {globalNotebooks.length > 0 && (
            <NotebookSection
              title={t('notebooks.globalSection')}
              notebooks={globalNotebooks}
              alwaysShowToggle
              onOpen={setOpenNotebook}
            />
          )}
          <NotebookSection
            title={t('notebooks.privateSection')}
            notebooks={privateNotebooks}
            emptyText={t('notebooks.empty')}
            onOpen={setOpenNotebook}
            onEdit={setEditingNotebook}
            canEdit={canEdit}
          />
        </>
      )}

      {openNotebook && (
        <NotebookEntriesModal
          notebook={openNotebook}
          canEdit={canEdit(openNotebook)}
          onClose={() => setOpenNotebook(null)}
          onDeleted={() => notebooks.remove(openNotebook.id)}
          onEdit={() => setEditingNotebook(openNotebook)}
          onCountsChanged={(learned, notLearned) => notebooks.setCounts(openNotebook.id, learned, notLearned)}
        />
      )}

      {editingNotebook && (
        <EditNotebookModal notebook={editingNotebook} onClose={() => setEditingNotebook(null)} onSaved={handleSaved} />
      )}
    </div>
  )
}
