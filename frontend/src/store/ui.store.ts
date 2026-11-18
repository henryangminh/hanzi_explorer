import { create } from 'zustand'
import type { NotebookResponse, RadicalSummary, UserNoteResponse } from '@/types'

interface UIState {
  // Notebooks
  openNotebook: NotebookResponse | null
  setOpenNotebook: (nb: NotebookResponse | null) => void
  selectedNotebookChar: string | null
  setSelectedNotebookChar: (char: string | null) => void

  // Radicals
  selectedRadical: RadicalSummary | null
  setSelectedRadical: (r: RadicalSummary | null) => void
  selectedRadicalChar: string | null
  setSelectedRadicalChar: (char: string | null) => void

  // My Notes
  expandedNote: UserNoteResponse | null
  setExpandedNote: (n: UserNoteResponse | null) => void

  /** Close everything (another account signs in). */
  reset: () => void
}

const INITIAL = {
  openNotebook: null,
  selectedNotebookChar: null,
  selectedRadical: null,
  selectedRadicalChar: null,
  expandedNote: null,
}

export const useUIStore = create<UIState>((set) => ({
  ...INITIAL,
  reset: () => set(INITIAL),

  setOpenNotebook: (nb) => set({ openNotebook: nb }),
  setSelectedNotebookChar: (char) => set({ selectedNotebookChar: char }),

  setSelectedRadical: (r) => set({ selectedRadical: r }),
  setSelectedRadicalChar: (char) => set({ selectedRadicalChar: char }),

  setExpandedNote: (n) => set({ expandedNote: n }),
}))
