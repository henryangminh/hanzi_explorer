import { useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { FlashcardStatus, FlashcardStatusMap, NotebookEntryPreview } from '@/types'
import { EntryCard } from './EntryCard'

const COLUMNS = 2
const ESTIMATED_ROW_HEIGHT = 140

interface EntryGridProps {
  entries: NotebookEntryPreview[]
  statuses: FlashcardStatusMap
  scrollElement: () => HTMLElement | null
  removable: boolean
  removingChar: string | null
  onSelect: (char: string) => void
  /** Omitted: no learned / not learned buttons. */
  onStatusChange?: (char: string, status: FlashcardStatus | null) => void
  onRemove: (entry: NotebookEntryPreview) => void
}

/** Virtualized two-column grid (notebooks can hold thousands of words). */
export function EntryGrid({ entries, statuses, scrollElement, removable, removingChar, onSelect, onStatusChange, onRemove }: EntryGridProps) {
  const rows = useMemo(() => {
    const result: NotebookEntryPreview[][] = []
    for (let i = 0; i < entries.length; i += COLUMNS) result.push(entries.slice(i, i + COLUMNS))
    return result
  }, [entries])

  // The virtualizer is only used inside this component, so the compiler skipping it is harmless
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: scrollElement,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 5,
  })

  return (
    <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }} className="mt-2">
      {virtualizer.getVirtualItems().map((virtualRow) => (
        <div
          key={virtualRow.index}
          ref={virtualizer.measureElement}
          data-index={virtualRow.index}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}
          className="grid grid-cols-2 gap-2 pb-2"
        >
          {rows[virtualRow.index].map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              status={statuses[entry.char]}
              removable={removable}
              removing={removingChar === entry.char}
              onSelect={() => onSelect(entry.char)}
              onStatusChange={onStatusChange && ((status) => onStatusChange(entry.char, status))}
              onRemove={() => onRemove(entry)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
