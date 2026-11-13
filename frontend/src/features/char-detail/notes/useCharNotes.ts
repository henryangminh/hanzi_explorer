import { useState } from 'react'
import { notesApi, type NoteInput } from '@/api/notesApi'
import type { UserNoteResponse } from '@/types'

/** The user's notes on one word, kept in sync with the server. `onChange` runs after each save/delete. */
export function useCharNotes(char: string, initialNotes: UserNoteResponse[], onChange?: () => void) {
  const [notes, setNotes] = useState(initialNotes)

  return {
    notes,
    /**
     * Server copy (from the full entry, fetched while the user may already be adding notes):
     * keep notes created locally meanwhile instead of dropping them.
     */
    replaceAll: (serverNotes: UserNoteResponse[]) => setNotes((prev) => [
      ...serverNotes,
      ...prev.filter((local) => !serverNotes.some((n) => n.id === local.id)),
    ]),
    add: async (input: NoteInput) => {
      const note = await notesApi.create(char, input)
      // The full entry may have arrived with this note already
      setNotes((prev) => [...prev.filter((n) => n.id !== note.id), note])
      onChange?.()
    },
    update: async (noteId: number, input: NoteInput) => {
      const note = await notesApi.update(char, noteId, input)
      setNotes((prev) => prev.map((n) => (n.id === noteId ? note : n)))
      onChange?.()
    },
    remove: async (noteId: number) => {
      await notesApi.remove(char, noteId)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
      onChange?.()
    },
  }
}

export type CharNotes = ReturnType<typeof useCharNotes>
