import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FlashcardEntry, FlashcardStatus } from '@/types'

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
  updateCardStatus: (widgetId: string, char: string, status: FlashcardStatus | null) => void
}

export const MAX_WIDGETS = 3

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
        if (state.widgets.length >= MAX_WIDGETS) return state
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
    {
      name: 'flashcard-storage',
      version: 1,
      // v1: cards carry every reading (`readings`) — drop cached cards so widgets reload them
      migrate: (persisted, version) => {
        const state = persisted as { widgets?: FlashcardWidgetConfig[] }
        if (version < 1 && state.widgets) {
          state.widgets = state.widgets.map((w) => ({ ...w, cards: [], lastRefreshed: null }))
        }
        return state as FlashcardState
      },
    }
  )
)
