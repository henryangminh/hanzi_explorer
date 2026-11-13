import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { ColorizedHanzi, ColorizedPinyin } from '@/lib/pinyinColor'
import type { DictLiteResponse } from '@/types'
import type { EntryPreview } from '../entryPreview'

/** Collapsed card content: word (+ traditional), reading · Hán Việt, first meaning. Selectable text. */
export function EntrySummary({ entry, preview }: { entry: DictLiteResponse; preview: EntryPreview }) {
  const { t } = useTranslation()
  const isMultiChar = entry.char.length > 1
  const size = isMultiChar ? 'text-3xl' : 'text-2xl'
  const showTraditional = preview.traditional && preview.traditional !== entry.char && !preview.traditional.includes('⁑') && preview.pinyin

  return (
    <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 select-text">
      {preview.pinyin ? (
        <ColorizedHanzi char={entry.char} pinyin={preview.pinyin} className={cn('font-cjk leading-none cursor-text', size)} />
      ) : (
        <span className={cn('font-cjk leading-none cursor-text', size, isMultiChar ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]')}>
          {entry.char}
        </span>
      )}
      {showTraditional && (
        <span className={cn('font-cjk leading-none text-[var(--color-text-muted)] cursor-text', size)}>
          (<ColorizedHanzi char={preview.traditional!} pinyin={preview.pinyin!} />)
        </span>
      )}
      {preview.pinyin || preview.meaning ? (
        <div className="w-full text-sm">
          {preview.pinyin && (
            <span className="font-medium cursor-text">
              <ColorizedPinyin pinyin={preview.pinyin} n={[...entry.char].length} />
              {entry.sino_vn?.length > 0 && (
                <span className="ml-1.5 text-[var(--color-text-muted)]">· {entry.sino_vn.join(', ')}</span>
              )}
              {entry.cedict.length > 1 && (
                <span className="ml-1.5 text-xs text-[var(--color-text-muted)]">
                  {t('dictionary.moreReadings', { count: entry.cedict.length - 1 })}
                </span>
              )}
            </span>
          )}
          {preview.meaning && (
            <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5 cursor-text">{preview.meaning}</p>
          )}
        </div>
      ) : (
        <span className="text-xs text-[var(--color-text-muted)] italic">{t('dictionary.noResult')}</span>
      )}
    </div>
  )
}
