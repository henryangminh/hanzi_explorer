import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X } from 'lucide-react'
import { ModalOverlay } from '@/components/ui/ModalOverlay'
import { Select } from '@/components/ui/Select'
import { CreateNotebookForm } from '@/features/notebooks/components/CreateNotebookForm'
import { sortOptions } from '@/features/notebooks/sortOptions'
import { NotebookPickItem } from './save-to-notebook/NotebookPickItem'
import { useSaveToNotebook } from './save-to-notebook/useSaveToNotebook'

interface Props {
  char: string
  onClose: () => void
  excludeNotebookId?: number
}

/** Pick (or create) a private notebook to save a word into. */
export function SaveToNotebookModal({ char, onClose, excludeNotebookId }: Props) {
  const { t } = useTranslation()
  const picker = useSaveToNotebook(char, excludeNotebookId)
  const [showCreate, setShowCreate] = useState(false)

  return (
    <ModalOverlay onClose={onClose}>
      <div className="relative w-full max-w-md mx-4 bg-[var(--color-bg-surface)] rounded-2xl shadow-xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text)]">{t('notebooks.saveToNotebook')}</h2>
            <p className="text-sm text-[var(--color-text-muted)] font-cjk mt-0.5">{char}</p>
          </div>
          <button
            title={t('common.close')}
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-2 shrink-0">
          <Select value={picker.sort} options={sortOptions(t)} onChange={picker.setSort} />
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-2">
          {picker.loading || picker.notebooks.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
              {picker.loading ? t('common.loading') : t('notebooks.empty')}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {picker.notebooks.map((nb) => (
                <NotebookPickItem
                  key={nb.id}
                  notebook={nb}
                  saving={picker.savingId === nb.id}
                  feedback={picker.feedbackFor(nb.id)}
                  onPick={() => picker.save(nb)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-[var(--color-border)] shrink-0">
          {showCreate ? (
            <CreateNotebookForm
              idPrefix="save-nb"
              onCreated={() => { setShowCreate(false); picker.reload() }}
              onCancel={() => setShowCreate(false)}
            />
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:opacity-80 transition-opacity"
            >
              <Plus size={15} />
              {t('notebooks.createNew')}
            </button>
          )}
        </div>
      </div>
    </ModalOverlay>
  )
}
