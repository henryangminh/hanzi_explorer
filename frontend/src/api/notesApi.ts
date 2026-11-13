import api from '@/lib/axios'
import type { UserNoteResponse } from '@/types'

export interface NoteInput {
  title: string
  detail: string | null
}

const notePath = (char: string) => `/dictionary/${encodeURIComponent(char)}/notes`

export const notesApi = {
  listAll: async (): Promise<UserNoteResponse[]> => {
    const { data } = await api.get<UserNoteResponse[]>('/dictionary/notes')
    return data
  },

  create: async (char: string, note: NoteInput): Promise<UserNoteResponse> => {
    const { data } = await api.post<UserNoteResponse>(notePath(char), note)
    return data
  },

  update: async (char: string, noteId: number, note: NoteInput): Promise<UserNoteResponse> => {
    const { data } = await api.put<UserNoteResponse>(`${notePath(char)}/${noteId}`, note)
    return data
  },

  remove: async (char: string, noteId: number): Promise<void> => {
    await api.delete(`${notePath(char)}/${noteId}`)
  },
}
