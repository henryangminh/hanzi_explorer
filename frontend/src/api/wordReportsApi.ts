import api from '@/lib/axios'
import type { WordReport, WordReportStatus } from '@/types'

export const wordReportsApi = {
  create: async (char: string, message: string): Promise<void> => {
    await api.post('/word-reports', { char, message })
  },

  /** Admin only. */
  list: async (status: WordReportStatus): Promise<WordReport[]> => {
    const { data } = await api.get<WordReport[]>('/word-reports', { params: { status } })
    return data
  },

  /** Admin only. */
  setStatus: async (id: number, status: WordReportStatus): Promise<void> => {
    await api.patch(`/word-reports/${id}`, { status })
  },

  /** Admin only. */
  remove: async (id: number): Promise<void> => {
    await api.delete(`/word-reports/${id}`)
  },
}
