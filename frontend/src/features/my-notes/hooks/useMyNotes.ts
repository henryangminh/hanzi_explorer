import { useEffect, useState } from 'react'
import { notesApi } from '@/api/notesApi'
import type { UserNoteResponse } from '@/types'

/** All of the user's notes, newest first. */
export function useMyNotes() {
  const [notes, setNotes] = useState<UserNoteResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    notesApi.listAll().then(setNotes).finally(() => setLoading(false))
  }, [])

  return {
    notes,
    loading,
    replace: (note: UserNoteResponse) => setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n))),
    remove: (id: number) => setNotes((prev) => prev.filter((n) => n.id !== id)),
  }
}
