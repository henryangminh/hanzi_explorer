import api from '@/lib/axios'
import type { SearchHistoryListResponse } from '@/types'

export const searchHistoryApi = {
  getHistory: async (): Promise<SearchHistoryListResponse> => {
    const { data } = await api.get<SearchHistoryListResponse>('/search-history')
    return data
  },

  deleteAll: async (): Promise<void> => {
    await api.delete('/search-history')
  },

  deleteBulk: async (chars: string[]): Promise<void> => {
    await api.delete('/search-history/bulk', { data: { chars } })
  },

  deleteOne: async (char: string): Promise<void> => {
    await api.delete('/search-history/bulk', { data: { chars: [char] } })
  },
}
