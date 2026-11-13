import api from '@/lib/axios'
import type { FlashcardEntry } from '@/types'

export const wotdApi = {
  /** Record the words of a day (idempotent). */
  save: async (date: string, chars: string[]): Promise<void> => {
    await api.post('/wotd', { date, chars })
  },

  dates: async (): Promise<string[]> => {
    const { data } = await api.get<string[]>('/wotd/dates')
    return data
  },

  forDate: async (date: string): Promise<FlashcardEntry[]> => {
    const { data } = await api.get<FlashcardEntry[]>(`/wotd/${date}`)
    return data
  },
}
