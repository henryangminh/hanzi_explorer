import { create } from 'zustand'

interface NotebookState {
  /** Incremented whenever an entry is added to any notebook */
  version: number
  invalidate: () => void
}

export const useNotebookStore = create<NotebookState>((set) => ({
  version: 0,
  invalidate: () => set((s) => ({ version: s.version + 1 })),
}))
