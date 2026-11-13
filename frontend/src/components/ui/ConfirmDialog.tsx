import { useTranslation } from 'react-i18next'
import { Button } from './Button'

interface ConfirmDialogProps {
  message: string
  confirmLabel: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Destructive-action confirmation shown over its positioned parent. */
export function ConfirmDialog({ message, confirmLabel, loading, onConfirm, onCancel }: ConfirmDialogProps) {
  const { t } = useTranslation()
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
      <div className="bg-[var(--color-bg-surface)] rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
        <p className="text-sm text-[var(--color-text)] mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white" isLoading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
