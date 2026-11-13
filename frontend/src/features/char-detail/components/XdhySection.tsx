import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { groupInOrder } from '@/lib/groupBy'
import { normalizePinyin } from '@/lib/pinyin'
import { ColorizedPinyin } from '@/lib/pinyinColor'
import type { XdhyEntry } from '@/types'
import { CollapsibleSection } from './CollapsibleSection'
import { XdhyDefinitions } from './XdhyDefinitions'

/** All definitions of one exact reading, grouped by part of speech. */
function XdhyReading({ pinyin, syllableCount, entries, separated, indentGroups }: {
  pinyin: string
  syllableCount: number
  entries: XdhyEntry[]
  separated: boolean
  indentGroups: boolean
}) {
  const posGroups = groupInOrder(entries.flatMap((e) => e.defs), (d) => d.pos)
  return (
    <div className={cn('flex flex-col gap-2 flex-1 min-w-0', separated && 'pt-3 border-t border-[var(--color-border-md)]')}>
      <div className="flex items-center gap-2 flex-wrap">
        <ColorizedPinyin pinyin={pinyin} n={syllableCount} className="text-[var(--color-text-muted)] font-medium" />
      </div>
      {posGroups.map((group, i) => (
        <div key={i} className={cn('flex flex-col gap-1 mt-1', indentGroups && 'pl-4')}>
          <span className="inline-block text-sm font-medium text-[var(--color-primary)] border border-[var(--color-primary)] rounded px-1.5 py-0.5 mb-1 self-start">
            {group.key || '＊'}
          </span>
          <XdhyDefinitions defs={group.items} />
        </div>
      ))}
    </div>
  )
}

/** 现代汉语词典: readings that differ only in formatting are shown together. */
export function XdhySection({ char, entries }: { char: string; entries: XdhyEntry[] }) {
  const { t } = useTranslation()
  if (!entries?.length) return null
  const byReading = groupInOrder(entries, (x) => normalizePinyin(x.pinyin))
  return (
    <CollapsibleSection title={t('dictionary.xdhy')}>
      <div className="pl-4 flex flex-col gap-3">
        {byReading.map((reading, idx) => {
          const syllableCount = [...(reading.items[0].simplified || char)].length
          const exactReadings = groupInOrder(reading.items, (x) => x.pinyin)
          return (
            <div key={idx} className="mb-4">
              <div className="flex flex-col gap-3 mt-1">
                {exactReadings.map((exact, i) => (
                  <XdhyReading
                    key={i}
                    pinyin={exact.key}
                    syllableCount={syllableCount}
                    entries={exact.items}
                    separated={i > 0}
                    indentGroups={exactReadings.length > 1}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </CollapsibleSection>
  )
}
