import { create } from 'zustand'
import type { FlashcardStatus, ReaderToken } from '@/types'

interface ReaderState {
  text: string
  /** The analysed text; null while editing */
  tokens: ReaderToken[] | null
  /** Index of the clicked token */
  selected: number | null
  showPinyin: boolean
  setText: (text: string) => void
  setTokens: (tokens: ReaderToken[] | null) => void
  setSelected: (index: number | null) => void
  toggleShowPinyin: () => void
  /** Every occurrence of the word takes the new status. */
  setWordStatus: (word: string, status: FlashcardStatus | null) => void
  /** Clear the text (another account signs in). */
  reset: () => void
}

const INITIAL = { text: '', tokens: null, selected: null, showPinyin: true }

/** The reading assistant's text, kept while moving between pages. */
export const useReaderStore = create<ReaderState>()((set) => ({
  ...INITIAL,
  setText: (text) => set({ text }),
  setTokens: (tokens) => set({ tokens, selected: null }),
  setSelected: (selected) => set({ selected }),
  toggleShowPinyin: () => set((s) => ({ showPinyin: !s.showPinyin })),
  setWordStatus: (word, status) =>
    set((s) => ({ tokens: s.tokens?.map((t) => (t.word === word ? { ...t, status } : t)) ?? null })),
  reset: () => set(INITIAL),
}))
