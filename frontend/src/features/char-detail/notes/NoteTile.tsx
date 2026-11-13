import { cn } from '@/lib/cn'
import type { UserNoteResponse } from '@/types'

/** Truncated note card in the notes grid. */
export function NoteTile({ note, selected, onClick }: { note: UserNoteResponse; selected: boolean; onClick: () => void }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 p-3 rounded-lg border cursor-pointer transition-colors min-w-0',
        selected
          ? 'border-[var(--color-primary)] bg-[var(--color-bg-subtle)]'
          : 'border-[var(--color-border)] bg-[var(--color-bg-subtle)] hover:border-[var(--color-primary)]',
      )}
      onClick={onClick}
    >
      <p className="text-sm font-semibold text-[var(--color-text)] line-clamp-1 break-words min-w-0">{note.title}</p>
      {note.detail && (
        <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 break-words min-w-0">{note.detail}</p>
      )}
    </div>
  )
}
