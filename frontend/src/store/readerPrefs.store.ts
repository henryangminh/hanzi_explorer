import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HskStandard } from '@/types'

interface ReaderPrefsState {
  hskStandard: HskStandard
  /** Words above this level (or not in the list) are highlighted; null = off */
  hskLevel: number | null
  setHskStandard: (standard: HskStandard) => void
  setHskLevel: (level: number | null) => void
}

/** Highest level of each standard (7 = 7-9) */
export const HSK_MAX_LEVEL: Record<HskStandard, number> = { old: 6, new: 7, newest: 7 }

/** How the reading assistant shows words, remembered by the browser. */
export const useReaderPrefsStore = create<ReaderPrefsState>()(
  persist(
    (set) => ({
      hskStandard: 'newest',
      hskLevel: null,
      // HSK 2.0 has no 7-9: fall back to its highest level
      setHskStandard: (hskStandard) =>
        set((s) => ({ hskStandard, hskLevel: s.hskLevel && Math.min(s.hskLevel, HSK_MAX_LEVEL[hskStandard]) })),
      setHskLevel: (hskLevel) => set({ hskLevel }),
    }),
    { name: 'reader-prefs' },
  ),
)
