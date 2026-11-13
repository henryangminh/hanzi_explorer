import api from '@/lib/axios'
import { streamNdjson } from '@/lib/ndjson'
import type { DictionaryResponse, DictLiteResponse } from '@/types'

export const dictionaryApi = {
  /** Local-DB entry (fast, no external sources). */
  lookup: async (char: string): Promise<DictLiteResponse> => {
    const { data } = await api.get<DictLiteResponse>(`/dictionary/lookup?q=${encodeURIComponent(char)}`)
    return data
  },

  /** Full entry: DB + Wiktionary + the user's notes. */
  full: async (char: string): Promise<DictionaryResponse> => {
    const { data } = await api.get<DictionaryResponse>(`/dictionary/full/${encodeURIComponent(char)}`)
    return data
  },

  /** Stream search results (one lite entry per matched word). */
  search: (query: string, onEntries: (entries: DictLiteResponse[]) => void): Promise<void> =>
    streamNdjson<DictLiteResponse>(`/dictionary/search?q=${encodeURIComponent(query)}`, onEntries),
}
