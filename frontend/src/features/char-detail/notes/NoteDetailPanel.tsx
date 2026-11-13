import { useLayoutEffect, useRef, useState } from 'react'
import type { UserNoteResponse } from '@/types'
import { DeleteNoteButton, EditNoteButton } from '@/features/notes/NoteActions'
import { NoteText } from '@/features/notes/NoteText'

export const PANEL_BELOW_GRID = 'col-span-1 sm:col-span-3 sm:order-last w-full flex flex-col gap-2 p-3 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg-subtle)] min-w-0'

/** Full note below the grid, with edit and delete. Scrolls itself into view when it opens. */
export function NoteDetailPanel({ note, onEdit, onDelete }: {
  note: UserNoteResponse
  onEdit: () => void
  onDelete: () => Promise<void>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [deleting, setDeleting] = useState(false)

  useLayoutEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div ref={ref} className={PANEL_BELOW_GRID}>
      <NoteText note={note} />
      <div className="flex gap-2 mt-1">
        <EditNoteButton onClick={onEdit} />
        <DeleteNoteButton deleting={deleting} onClick={handleDelete} size={13} className="p-1.5 rounded" />
      </div>
    </div>
  )
}
