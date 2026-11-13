import { useState } from 'react'
import { notesApi } from '@/api/notesApi'
import type { UserNoteResponse } from '@/types'
import { useNoteDraft } from '@/features/notes/useNoteDraft'

/** Edit / delete one note: draft state, the edit toggle, and the API calls. */
export function useNoteEditor(
  note: UserNoteResponse,
  onUpdated: (note: UserNoteResponse) => void,
  onDeleted: (id: number) => void,
) {
  const draft = useNoteDraft(note.title, note.detail ?? '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function save() {
    if (!draft.isValid) return
    setSaving(true)
    try {
      onUpdated(await notesApi.update(note.char, note.id, draft.toInput()))
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setDeleting(true)
    try {
      await notesApi.remove(note.char, note.id)
      onDeleted(note.id)
    } finally {
      setDeleting(false)
    }
  }

  function cancelEdit() {
    setEditing(false)
    draft.reset(note.title, note.detail ?? '')
  }

  return { draft, editing, startEdit: () => setEditing(true), cancelEdit, save, saving, remove, deleting }
}

export type NoteEditor = ReturnType<typeof useNoteEditor>
