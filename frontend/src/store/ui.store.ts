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
}

export const useUIStore = create<UIState>((set) => ({
  openNotebook: null,
  setOpenNotebook: (nb) => set({ openNotebook: nb }),
  selectedNotebookChar: null,
  setSelectedNotebookChar: (char) => set({ selectedNotebookChar: char }),

  selectedRadical: null,
  setSelectedRadical: (r) => set({ selectedRadical: r }),
  selectedRadicalChar: null,
  setSelectedRadicalChar: (char) => set({ selectedRadicalChar: char }),

  expandedNote: null,
  setExpandedNote: (n) => set({ expandedNote: n }),
}))
