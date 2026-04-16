import { create } from 'zustand'
import type { DictLiteResponse } from '@/types'

interface DictionaryState {
  query: string
  results: DictLiteResponse[]
  setQuery: (q: string) => void
  setResults: (results: DictLiteResponse[]) => void
  appendResult: (entry: DictLiteResponse) => void
  clearResults: () => void
}

export const useDictionaryStore = create<DictionaryState>()((set) => ({
  query: '',
  results: [],
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  appendResult: (entry) => set((s) => ({ results: [...s.results, entry] })),
  clearResults: () => set({ results: [], query: '' }),
}))
