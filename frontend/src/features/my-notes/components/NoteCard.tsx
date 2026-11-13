import { memo, useCallback } from 'react'
import { cn } from '@/lib/cn'
import type { UserNoteResponse } from '@/types'
import { NoteReading, NoteWord } from './NoteReading'

/** Small square card in the notes grid: word + reading, title and a few lines of detail. */
export const NoteCard = memo(function NoteCard({ note, onToggle }: {
  note: UserNoteResponse
  onToggle: (note: UserNoteResponse) => void
}) {
  const handleClick = useCallback(() => onToggle(note), [note, onToggle])
  return (
    <button
      onClick={handleClick}
      className={cn(
        'group flex flex-col text-left gap-1.5 p-3 rounded-xl border',
        'bg-[var(--color-bg-subtle)] border-[var(--color-border)]',
        'hover:border-[var(--color-primary)] hover:shadow-sm transition-all',
        'sm:aspect-square overflow-hidden',
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-cjk text-xl font-bold leading-none shrink-0 group-hover:scale-105 transition-transform origin-left">
          <NoteWord note={note} />
        </span>
        <NoteReading
          note={note}
          className="min-w-0 overflow-hidden"
          pinyinClass="text-[10px] font-medium leading-none truncate"
          sinoVnClass="text-[10px] leading-none truncate"
        />
      </div>
      <div className="w-full h-px bg-[var(--color-border)] my-0.5 shrink-0" />
      <p className="text-xs font-semibold text-[var(--color-text)] line-clamp-2 break-words min-w-0 leading-snug">{note.title}</p>
      {note.detail && (
        <p className="text-[10px] text-[var(--color-text-muted)] line-clamp-3 break-words min-w-0 leading-snug">{note.detail}</p>
      )}
    </button>
  )
})
