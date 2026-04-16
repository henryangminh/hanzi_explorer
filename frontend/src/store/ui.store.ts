import { create } from 'zustand'
import type { RadicalSummary, NotebookResponse, UserNoteResponse } from '@/types'

/**
 * Persistent UI state for popup/modal visibility across page navigations.
 * Component state resets on unmount (navigate away), so we store popup
 * selections here so they survive tab switches.
 */
interface UIState {
  // Radicals page — which radical popup is open + which char detail is shown
  radicalsSelected: RadicalSummary | null
  radicalsCurrentChar: string | null
  setRadicalsSelected: (r: RadicalSummary | null) => void
  setRadicalsCurrentChar: (char: string | null) => void

  // Notebooks page — which notebook is open + which char detail is shown
  notebooksOpen: NotebookResponse | null
  notebooksCurrentChar: string | null
  setNotebooksOpen: (nb: NotebookResponse | null) => void
  setNotebooksCurrentChar: (char: string | null) => void

  // My Notes page
  myNotesExpanded: UserNoteResponse | null
  setMyNotesExpanded: (note: UserNoteResponse | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  radicalsSelected: null,
  radicalsCurrentChar: null,
  setRadicalsSelected: (r) => set({ radicalsSelected: r, radicalsCurrentChar: null }),
  setRadicalsCurrentChar: (char) => set({ radicalsCurrentChar: char }),

  notebooksOpen: null,
  notebooksCurrentChar: null,
  setNotebooksOpen: (nb) => set({ notebooksOpen: nb, notebooksCurrentChar: null }),
  setNotebooksCurrentChar: (char) => set({ notebooksCurrentChar: char }),

  myNotesExpanded: null,
  setMyNotesExpanded: (note) => set({ myNotesExpanded: note }),
}))
