import { useTranslation } from 'react-i18next'
import { isSeparablePinyin } from '@/lib/pinyin'
import type { DictLiteResponse } from '@/types'

/** Facts about the word shown as tags: HSK level, separable verb. Nothing when there are none. */
export function EntryTags({ entry }: { entry: DictLiteResponse }) {
  const { t } = useTranslation()
  const isSeparable = entry.xdhy?.some((x) => isSeparablePinyin(x.pinyin))
  const hskLevel = entry.cedict[0]?.hsk_level
  if (!hskLevel && !isSeparable) return null

  return (
    <div className="w-full flex flex-wrap gap-1.5">
      {hskLevel && (
        <span className="text-xs bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-full text-[var(--color-text-muted)]">HSK {hskLevel}</span>
      )}
      {isSeparable && (
        <span className="text-xs px-2 py-0.5 rounded border border-[var(--color-accent)] text-[var(--color-accent)]">
          {t('dictionary.separable')}
        </span>
      )}
    </div>
  )
}
