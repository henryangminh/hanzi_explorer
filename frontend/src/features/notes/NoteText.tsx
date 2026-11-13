import { cn } from '@/lib/cn'
import type { UserNoteResponse } from '@/types'

/** A note's title and (multi-line) detail. */
export function NoteText({ note, relaxed = false }: { note: UserNoteResponse; relaxed?: boolean }) {
  return (
    <>
      <p className={cn('text-sm font-semibold text-[var(--color-text)] break-words min-w-0', relaxed && 'leading-snug')}>
        {note.title}
      </p>
      {note.detail && (
        <p className={cn('text-sm text-[var(--color-text-muted)] break-words whitespace-pre-wrap min-w-0', relaxed && 'leading-relaxed')}>
          {note.detail}
        </p>
      )}
    </>
  )
}
