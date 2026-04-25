import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FlashcardEntry } from '@/types'

export type IntervalUnit = 'minutes' | 'hours' | 'days'
export type RepeatMode = 'random' | 'repeat_unlearned' | 'unlearned_only' | 'no_repeat'

export interface FlashcardWidgetConfig {
  id: string
  name: string
  intervalValue: number
  intervalUnit: IntervalUnit
  count: number
  notebookIds: number[]
  isDefault: boolean
  lastRefreshed: string | null
  cards: FlashcardEntry[]
  repeatMode?: RepeatMode
}

interface FlashcardState {
  widgets: FlashcardWidgetConfig[]
  addWidget: (config: Omit<FlashcardWidgetConfig, 'id' | 'cards' | 'lastRefreshed'>) => void
  updateWidget: (id: string, updates: Partial<Omit<FlashcardWidgetConfig, 'id'>>) => void
  removeWidget: (id: string) => void
  setWidgetCards: (id: string, cards: FlashcardEntry[]) => void
  updateCardStatus: (widgetId: string, char: string, status: 'learned' | 'not_learned' | null) => void
}

function generateId(): string {
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getIntervalMs(value: number, unit: IntervalUnit): number {
  switch (unit) {
    case 'minutes': return value * 60 * 1000
    case 'hours': return value * 60 * 60 * 1000
    case 'days': return value * 24 * 60 * 60 * 1000
  }
}

export const useFlashcardStore = create<FlashcardState>()(
  persist(
    (set) => ({
      widgets: [],

      addWidget: (config) => set((state) => {
        if (state.widgets.length >= 3) return state
        return {
          widgets: [
            ...state.widgets,
            {
              ...config,
              id: generateId(),
              cards: [],
              lastRefreshed: null,
            },
          ],
        }
      }),

      updateWidget: (id, updates) => set((state) => ({
        widgets: state.widgets.map((w) =>
          w.id === id ? { ...w, ...updates } : w
        ),
      })),

      removeWidget: (id) => set((state) => ({
        widgets: state.widgets.filter((w) => w.id !== id),
      })),

      setWidgetCards: (id, cards) => set((state) => ({
        widgets: state.widgets.map((w) =>
          w.id === id
            ? { ...w, cards, lastRefreshed: new Date().toISOString() }
            : w
        ),
      })),

      updateCardStatus: (widgetId, char, status) => set((state) => ({
        widgets: state.widgets.map((w) =>
          w.id === widgetId
            ? { ...w, cards: w.cards.map((c) => c.char === char ? { ...c, status } : c) }
            : w
        ),
      })),
    }),
    { name: 'flashcard-storage' }
  )
)
