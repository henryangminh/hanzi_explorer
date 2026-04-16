import { create } from 'zustand'
import type { DictLiteResponse } from '@/types'

export interface SearchTab {
  id: string
  query: string
  results: DictLiteResponse[]
  loading: boolean
  error: string
}

interface DictionaryState {
  query: string
  tabs: SearchTab[]
  activeTabId: string | null
  setQuery: (q: string) => void
  addTab: (tab: SearchTab) => void
  setActiveTabId: (id: string | null) => void
  closeTab: (id: string) => void
  appendResultToTab: (tabId: string, entry: DictLiteResponse) => void
  finishTab: (tabId: string, error?: string) => void
}

export const useDictionaryStore = create<DictionaryState>()((set) => ({
  query: '',
  tabs: [],
  activeTabId: null,

  setQuery: (query) => set({ query }),

  addTab: (tab) =>
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id })),

  setActiveTabId: (activeTabId) => set({ activeTabId }),

  closeTab: (tabId) =>
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === tabId)
      const newTabs = s.tabs.filter((t) => t.id !== tabId)
      let newActiveId = s.activeTabId
      if (s.activeTabId === tabId) {
        const next = newTabs[idx] ?? newTabs[idx - 1] ?? null
        newActiveId = next?.id ?? null
      }
      return { tabs: newTabs, activeTabId: newActiveId }
    }),

  appendResultToTab: (tabId, entry) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === tabId ? { ...t, results: [...t.results, entry] } : t
      ),
    })),

  finishTab: (tabId, error) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === tabId
          ? { ...t, loading: false, error: error ?? '' }
          : t
      ),
    })),
}))
