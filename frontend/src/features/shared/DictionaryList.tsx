import { cn } from '@/lib/cn'

interface CoreDictEntry {
  id: number
  pinyin: string
  hsk_level: number | null
}

interface DictionaryListProps<T extends CoreDictEntry> {
  entries: T[]
  renderMeaning: (entry: T) => React.ReactNode
}

export function DictionaryList<T extends CoreDictEntry>({
  entries,
  renderMeaning,
}: DictionaryListProps<T>) {
  if (!entries || entries.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          className={cn(
            'flex flex-col gap-1 pl-3',
            entries.length > 1 && 'border-l-2 border-[var(--color-border-md)]'
          )}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {entries.length > 1 && (
              <span className="text-xs font-medium text-[var(--color-primary)]">
                #{idx + 1}
              </span>
            )}
            <span className="font-medium text-[var(--color-text)]">
              {entry.pinyin}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            {renderMeaning(entry)}
          </div>

          <div className="flex flex-wrap gap-2 mt-0.5">
            {entry.hsk_level && (
              <span className="text-xs bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-full text-[var(--color-primary)] w-fit">
                HSK {entry.hsk_level}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
