import api from '@/lib/axios'
import type { ReaderToken } from '@/types'

export const readerApi = {
  /** Split a text into words with pinyin and the user's learned statuses. */
  segment: async (text: string): Promise<ReaderToken[]> => {
    const { data } = await api.post<ReaderToken[]>('/reader/segment', { text })
    return data
  },
}
