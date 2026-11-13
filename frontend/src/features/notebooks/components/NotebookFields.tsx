import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/Input'

export const MAX_NOTEBOOK_DESCRIPTION = 150

interface NotebookFieldsProps {
  idPrefix: string
  name: string
  description: string
  onNameChange: (v: string) => void
  onDescriptionChange: (v: string) => void
}

/** Name + optional description inputs of a notebook form. */
export function NotebookFields({ idPrefix, name, description, onNameChange, onDescriptionChange }: NotebookFieldsProps) {
  const { t } = useTranslation()
  return (
    <>
      <Input
        id={`${idPrefix}-name`}
        label={t('notebooks.nameLabel')}
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={t('notebooks.namePlaceholder')}
        autoFocus
      />
      <Input
        id={`${idPrefix}-desc`}
        label={t('notebooks.descLabel')}
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value.slice(0, MAX_NOTEBOOK_DESCRIPTION))}
        maxLength={MAX_NOTEBOOK_DESCRIPTION}
        placeholder={t('notebooks.descPlaceholder')}
      />
    </>
  )
}
