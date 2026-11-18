import { useTranslation } from 'react-i18next'
import { Select } from '@/components/ui/Select'
import { HSK_MAX_LEVEL, useReaderPrefsStore } from '@/store/readerPrefs.store'
import type { HskStandard } from '@/types'

const OFF = 'off'

/** Pick an HSK standard and level; words above it get highlighted in the text. */
export function HskFilter() {
  const { t } = useTranslation()
  const { hskStandard, hskLevel, setHskStandard, setHskLevel } = useReaderPrefsStore()

  const standards: { value: HskStandard; label: string }[] = [
    { value: 'newest', label: t('reader.hskNewest') },
    { value: 'new', label: t('reader.hskNew') },
    { value: 'old', label: t('reader.hskOld') },
  ]
  const levels = [
    { value: OFF, label: t('reader.hskOff') },
    ...Array.from({ length: HSK_MAX_LEVEL[hskStandard] }, (_, i) => ({
      value: String(i + 1),
      label: i + 1 === 7 ? 'HSK 7-9' : `HSK ${i + 1}`,
    })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-[var(--color-text-muted)]">{t('reader.hskHighlight')}</span>
      <Select
        value={hskLevel === null ? OFF : String(hskLevel)}
        options={levels}
        onChange={(v) => setHskLevel(v === OFF ? null : Number(v))}
      />
      {hskLevel !== null && <Select value={hskStandard} options={standards} onChange={setHskStandard} />}
    </div>
  )
}
