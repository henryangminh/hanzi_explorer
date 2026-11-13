import { useState } from 'react'
import type { NoteInput } from '@/api/notesApi'

export const MAX_NOTE_TITLE = 50
export const MAX_NOTE_DETAIL = 250

/** Title + detail being typed, clipped to their limits. */
export function useNoteDraft(initialTitle = '', initialDetail = '') {
  const [title, setTitleRaw] = useState(initialTitle)
  const [detail, setDetailRaw] = useState(initialDetail)

  return {
    title,
    detail,
    setTitle: (v: string) => setTitleRaw(v.slice(0, MAX_NOTE_TITLE)),
    setDetail: (v: string) => setDetailRaw(v.slice(0, MAX_NOTE_DETAIL)),
    reset: (t = '', d = '') => { setTitleRaw(t); setDetailRaw(d) },
    /** A title is required. */
    isValid: title.trim().length > 0,
    toInput: (): NoteInput => ({ title: title.trim(), detail: detail.trim() || null }),
  }
}

export type NoteDraft = ReturnType<typeof useNoteDraft>
