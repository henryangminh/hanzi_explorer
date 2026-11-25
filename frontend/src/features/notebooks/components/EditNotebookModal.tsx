import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { notebooksApi } from '@/api/notebooksApi'
import { Button } from '@/components/ui/Button'
import { ModalOverlay } from '@/components/ui/ModalOverlay'
import type { NotebookResponse } from '@/types'
import { NotebookFields } from './NotebookFields'

interface EditNotebookModalProps {
  notebook: NotebookResponse
  onClose: () => void
  onSaved: (nb: NotebookResponse) => void
}

export function EditNotebookModal({ notebook, onClose, onSaved }: EditNotebookModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(notebook.name)
  const [description, setDescription] = useState(notebook.description ?? '')
  const [saving, setSaving] = useState(false)
  const [nameTaken, setNameTaken] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      onSaved(await notebooksApi.update(notebook.id, { name: name.trim(), description: description.trim() || null }))
      onClose()
    } catch (err) {
      if (!isAxiosError(err) || err.response?.status !== 409) throw err
      setNameTaken(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} className="bg-black/60 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-[var(--color-bg-surface)] rounded-xl shadow-2xl p-5 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">{t('notebooks.editTitle')}</h3>
        <NotebookFields
          idPrefix="edit-nb"
          name={name}
          description={description}
          nameError={nameTaken ? t('notebooks.nameTaken') : undefined}
          onNameChange={(v) => { setName(v); setNameTaken(false) }}
          onDescriptionChange={setDescription}
        />
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" size="sm" isLoading={saving} disabled={!name.trim()}>
            {saving ? t('notebooks.saving') : t('notebooks.save')}
          </Button>
        </div>
      </form>
    </ModalOverlay>
  )
}
