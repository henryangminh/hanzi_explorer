import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { ColorizedHanzi, ColorizedPinyin } from '@/lib/pinyinColor'
import type { DictLiteResponse } from '@/types'
import type { EntryPreview } from '../entryPreview'
import { EntryTags } from './EntryTags'

/**
 * Card header: word (+ traditional), reading, Hán Việt (own line), tags, first meaning. Selectable text.
 * Tags are left out while expanded — the detail panel lists them all.
 */
export function EntrySummary({ entry, preview, showTags }: { entry: DictLiteResponse; preview: EntryPreview; showTags: boolean }) {
  const { t } = useTranslation()
  const isMultiChar = entry.char.length > 1
  const size = isMultiChar ? 'text-3xl' : 'text-2xl'
  const showTraditional = preview.traditional && preview.traditional !== entry.char && !preview.traditional.includes('⁑') && preview.pinyin

  return (
    <div className="select-text">
      <div className="leading-none">
      {preview.pinyin ? (
        <ColorizedHanzi char={entry.char} pinyin={preview.pinyin} className={cn('font-cjk leading-none cursor-text', size)} />
      ) : (
        <span className={cn('font-cjk leading-none cursor-text', size, isMultiChar ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]')}>
          {entry.char}
        </span>
      )}
      {showTraditional && (
        <span className={cn('font-cjk leading-none text-[var(--color-text-muted)] cursor-text ml-2', size)}>
          (<ColorizedHanzi char={preview.traditional!} pinyin={preview.pinyin!} />)
        </span>
      )}
      </div>
      {preview.pinyin || preview.meaning ? (
        <div className="mt-1 text-sm">
          {preview.pinyin && (
            <span className="font-medium cursor-text">
              <ColorizedPinyin pinyin={preview.pinyin} n={[...entry.char].length} />
              {entry.cedict.length > 1 && (
                <span className="ml-1.5 text-xs text-[var(--color-text-muted)]">
                  {t('dictionary.moreReadings', { count: entry.cedict.length - 1 })}
                </span>
              )}
            </span>
          )}
          {preview.pinyin && entry.sino_vn?.length > 0 && (
            <p className="mt-0.5 text-[var(--color-text-muted)] cursor-text">
              <span title={t('dictionary.hanVietTitle')} className="inline-block mr-1.5 align-[1px] text-[10px] leading-snug font-semibold px-1 rounded border border-[var(--color-border-md)]">
                {t('dictionary.hanVietTag')}
              </span>
              {entry.sino_vn.join(', ')}
            </p>
          )}
          {showTags && <EntryTags entry={entry} />}
          {preview.meaning && (
            <p className="text-[var(--color-text-muted)] truncate mt-0.5 cursor-text">{preview.meaning}</p>
          )}
        </div>
      ) : (
        <p className="mt-1 text-xs text-[var(--color-text-muted)] italic">{t('dictionary.noResult')}</p>
      )}
    </div>
  )
}
