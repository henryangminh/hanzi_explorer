import api from '@/lib/axios'
import type { RadicalChar, RadicalCharsResponse, RadicalSummary } from '@/types'

export const radicalsApi = {
  list: async (): Promise<RadicalSummary[]> => {
    const { data } = await api.get<RadicalSummary[]>('/radicals')
    return data
  },

  chars: async (radical: string): Promise<RadicalChar[]> => {
    const { data } = await api.get<RadicalCharsResponse>(`/radicals/${encodeURIComponent(radical)}/chars`)
    return data.chars ?? []
  },
}
