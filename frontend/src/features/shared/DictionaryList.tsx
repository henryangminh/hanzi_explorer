import { cn } from '@/lib/cn'
import { ColorizedPinyin } from '@/lib/pinyinColor'

interface CoreDictEntry {
  id: number
  pinyin: string
  hsk_level: number | null
  is_separable?: boolean
}

function formatPinyin(pinyin: string, isSeparable?: boolean): string {
  if (!isSeparable) return pinyin
  const spaceIdx = pinyin.indexOf(' ')
  if (spaceIdx === -1) return pinyin
  return pinyin.slice(0, spaceIdx) + '//' + pinyin.slice(spaceIdx + 1)
}

interface DictionaryListProps<T extends CoreDictEntry> {
  entries: T[]
  renderMeaning: (entry: T, hasSiblings: boolean) => React.ReactNode
}

export function DictionaryList<T extends CoreDictEntry>({
  entries,
  renderMeaning,
}: DictionaryListProps<T>) {
  if (!entries || entries.length === 0) return null

  // Group entries by case-insensitive pinyin
  const groupedEntries: { pinyin: string; is_separable?: boolean; items: T[] }[] = []
  const normalizePinyin = (p: string) => p.replace(/[·\.\/]+/g, '').toLowerCase()

  entries.forEach((entry) => {
    const existingGroup = groupedEntries.find(g => normalizePinyin(g.pinyin) === normalizePinyin(entry.pinyin))
    if (existingGroup) {
      existingGroup.items.push(entry)
    } else {
      groupedEntries.push({
        pinyin: entry.pinyin,
        is_separable: entry.is_separable,
        items: [entry],
      })
    }
  })

  return (
    <div className="flex flex-col gap-3">
      {groupedEntries.map((group, idx) => (
        <div
          key={group.pinyin + idx}
          className={cn(
            'flex flex-col gap-1 pl-3',
            groupedEntries.length > 1 && 'border-l-2 border-[var(--color-border-md)]'
          )}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <ColorizedPinyin
              pinyin={formatPinyin(group.pinyin, group.is_separable)}
              className="font-medium"
            />
          </div>

          <div className="flex flex-col gap-1.5 mt-0.5 pl-6">
            {group.items.map((entry, i) => (
              <div key={entry.id} className="flex flex-col gap-1">
                <div className="flex items-start gap-2">
                  {group.items.length > 1 && (
                    <span className="shrink-0 text-sm text-[var(--color-text-muted)] min-w-[1rem] text-right mt-[1px]">
                      {i + 1})
                    </span>
                  )}
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    {renderMeaning(entry, group.items.length > 1)}
                  </div>
                </div>

                {entry.hsk_level && (
                  <div className={cn("flex flex-wrap gap-2 mt-0.5", group.items.length > 1 && "ml-6")}>
                    <span className="text-xs bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-full text-[var(--color-primary)] w-fit">
                      HSK {entry.hsk_level}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
