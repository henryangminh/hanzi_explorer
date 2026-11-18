import api from '@/lib/axios'
import type { FlashcardEntry } from '@/types'

/** Spaced review of the words-of-the-day words marked "not learned". Dates are local YYYY-MM-DD. */
export const reviewApi = {
  due: async (date: string): Promise<FlashcardEntry[]> => {
    const { data } = await api.get<FlashcardEntry[]>('/review/due', { params: { date } })
    return data
  },

  schedule: async (char: string, date: string): Promise<void> => {
    await api.post('/review/schedule', { char, date })
  },

  unschedule: async (char: string): Promise<void> => {
    await api.delete(`/review/schedule/${encodeURIComponent(char)}`)
  },

  answer: async (char: string, date: string, remembered: boolean): Promise<void> => {
    await api.post('/review/answer', { char, date, remembered })
  },
}
