import api from '@/lib/axios'
import type { FlashcardEntry, FlashcardStatus, FlashcardStatusMap } from '@/types'

export const flashcardsApi = {
  /** Random cards from the given notebooks. */
  sample: async (notebookIds: number[], count: number): Promise<FlashcardEntry[]> => {
    const { data } = await api.get<FlashcardEntry[]>('/notebooks/flashcards', {
      params: { notebook_ids: notebookIds.join(','), count },
    })
    return data
  },

  /** Every card the user has marked learned / not learned. */
  marked: async (): Promise<FlashcardEntry[]> => {
    const { data } = await api.get<FlashcardEntry[]>('/notebooks/flashcards/marked')
    return data
  },

  statuses: async (chars: string[]): Promise<FlashcardStatusMap> => {
    const { data } = await api.get<FlashcardStatusMap>(
      `/notebooks/flashcards/statuses?chars=${encodeURIComponent(chars.join(','))}`,
    )
    return data
  },

  /** Statuses of every word in a notebook (no size limit, unlike `statuses`). */
  notebookStatuses: async (notebookId: number): Promise<FlashcardStatusMap> => {
    const { data } = await api.get<FlashcardStatusMap>(`/notebooks/${notebookId}/statuses`)
    return data
  },

  setStatus: async (char: string, status: FlashcardStatus | null): Promise<void> => {
    await api.put('/notebooks/flashcards/status', { char, status })
  },
}
