import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

/** The Hán Việt readings after an "HV" tag; nothing when there are none. */
export function HanVietLine({ readings, className }: { readings: string[] | undefined; className?: string }) {
  const { t } = useTranslation()
  if (!readings?.length) return null
  return (
    <p className={cn('text-[var(--color-text-muted)] cursor-text', className)}>
      <span title={t('dictionary.hanVietTitle')} className="inline-block mr-1.5 align-[1px] text-[10px] leading-snug font-semibold px-1 rounded border border-[var(--color-border-md)]">
        {t('dictionary.hanVietTag')}
      </span>
      {readings.join(', ')}
    </p>
  )
}
