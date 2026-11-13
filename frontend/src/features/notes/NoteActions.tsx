import { useTranslation } from 'react-i18next'
import { Loader2, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'

/** Cancel + Save buttons of a note form. */
export function NoteFormButtons({ saving, canSave, onCancel, onSave }: {
  saving: boolean
  canSave: boolean
  onCancel: () => void
  onSave: () => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <Button size="sm" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
      <Button size="sm" onClick={onSave} isLoading={saving} disabled={!canSave}>
        {saving ? t('dictionary.saving') : t('dictionary.save')}
      </Button>
    </>
  )
}

/** "Edit note" button. */
export function EditNoteButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <Button size="sm" variant="outline" className="flex items-center gap-1.5" onClick={onClick}>
      <Pencil size={12} />
      {t('dictionary.editNote')}
    </Button>
  )
}

/** Trash icon button that turns into a spinner while deleting. */
export function DeleteNoteButton({ deleting, onClick, size = 14, className }: {
  deleting: boolean
  onClick: () => void
  size?: number
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <button
      onClick={onClick}
      disabled={deleting}
      className={cn(
        'text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40',
        className ?? 'p-2 rounded-lg',
      )}
      title={t('dictionary.deleteNote')}
    >
      {deleting ? <Loader2 size={size} className="animate-spin" /> : <Trash2 size={size} />}
    </button>
  )
}
