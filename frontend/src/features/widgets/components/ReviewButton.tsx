import { useTranslation } from 'react-i18next'
import { RotateCcw } from 'lucide-react'

/** Opens the review session of the words due today. */
export function ReviewButton({ count, onClick }: { count: number; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 w-full py-1.5 mb-2 rounded-lg text-xs font-medium text-[var(--color-primary)] bg-[var(--color-bg-subtle)] hover:bg-[var(--color-border)] transition-colors"
    >
      <RotateCcw size={12} />
      {t('dashboard.review', { count })}
    </button>
  )
}
