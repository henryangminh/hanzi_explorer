import { useTranslation } from 'react-i18next'

/** Radical and stroke count, when known. */
export function RadicalInfo({ radical, strokeCount }: { radical: string | null; strokeCount: number | null }) {
  const { t } = useTranslation()
  if (!radical && !strokeCount) return null
  return (
    <div className="flex flex-wrap gap-3">
      {radical && (
        <span className="text-sm text-[var(--color-text-muted)]">
          {t('dictionary.radical')}: <span className="font-cjk font-medium text-[var(--color-text)]">{radical}</span>
        </span>
      )}
      {strokeCount && (
        <span className="text-sm text-[var(--color-text-muted)]">
          {t('dictionary.strokes')}: <span className="font-medium text-[var(--color-text)]">{strokeCount}</span>
        </span>
      )}
    </div>
  )
}
