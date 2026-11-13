import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { StickyNote } from 'lucide-react'

export function EmptyNotes() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-[var(--color-text-muted)]">
      <StickyNote size={36} strokeWidth={1.4} />
      <p className="text-sm">{t('myNotes.empty')}</p>
      <p className="text-xs">{t('myNotes.emptyHint')}</p>
      <button onClick={() => navigate('/dictionary')} className="mt-2 text-sm text-[var(--color-primary)] hover:underline">
        → {t('myNotes.goToDictionary')}
      </button>
    </div>
  )
}
