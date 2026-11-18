import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { notebooksApi } from '@/api/notebooksApi'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import type { NotebookResponse } from '@/types'
import { NotebookFields } from './NotebookFields'

type NotebookType = 'private' | 'global'

interface CreateNotebookFormProps {
  /** Admins may also create global notebooks. */
  allowGlobal?: boolean
  defaultType?: NotebookType
  idPrefix?: string
  className?: string
  onCreated: (nb: NotebookResponse) => void
  onCancel: () => void
}

export function CreateNotebookForm({ allowGlobal = false, defaultType = 'private', idPrefix = 'nb', className, onCreated, onCancel }: CreateNotebookFormProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<NotebookType>(defaultType)
  const [creating, setCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      onCreated(await notebooksApi.create({ name: name.trim(), description: description.trim() || null, type }))
    } finally {
      setCreating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-3', className)}>
      <NotebookFields
        idPrefix={idPrefix}
        name={name}
        description={description}
        onNameChange={setName}
        onDescriptionChange={setDescription}
      />
      {allowGlobal && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text)]">{t('notebooks.typeLabel')}</label>
          <Select
            value={type}
            options={[
              { value: 'private', label: t('notebooks.typePrivate') },
              { value: 'global', label: t('notebooks.typeGlobal') },
            ]}
            onChange={setType}
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
