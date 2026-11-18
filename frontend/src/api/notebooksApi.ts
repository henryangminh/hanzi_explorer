import api from '@/lib/axios'
import { streamNdjson } from '@/lib/ndjson'
import type { AddEntriesResult, NotebookEntryPreview, NotebookResponse, NotebookSortOrder } from '@/types'

export interface NotebookInput {
  name: string
  description: string | null
  type?: 'private' | 'global'
}

export const notebooksApi = {
  list: async (sort?: NotebookSortOrder): Promise<NotebookResponse[]> => {
    const { data } = await api.get<NotebookResponse[]>('/notebooks', { params: sort ? { sort } : undefined })
    return data
  },

  create: async (input: NotebookInput): Promise<NotebookResponse> => {
    const { data } = await api.post<NotebookResponse>('/notebooks', input)
    return data
  },

  update: async (id: number, input: NotebookInput): Promise<NotebookResponse> => {
    const { data } = await api.patch<NotebookResponse>(`/notebooks/${id}`, input)
    return data
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/notebooks/${id}`)
  },

  addEntry: async (notebookId: number, char: string): Promise<void> => {
    await api.post(`/notebooks/${notebookId}/entries`, { char })
  },

  /** Add many dictionary words at once; words not in the dictionary are reported, not added. */
  addEntries: async (notebookId: number, chars: string[]): Promise<AddEntriesResult> => {
    const { data } = await api.post<AddEntriesResult>(`/notebooks/${notebookId}/entries/bulk`, { chars })
    return data
  },

  removeEntry: async (notebookId: number, char: string): Promise<void> => {
    await api.delete(`/notebooks/${notebookId}/entries/${encodeURIComponent(char)}`)
  },

  /** Stream entry previews (with brief meanings) in batches. */
  streamEntries: (
    notebookId: number,
    sort: NotebookSortOrder,
    onEntries: (entries: NotebookEntryPreview[]) => void,
    signal: AbortSignal,
  ): Promise<void> =>
    streamNdjson<NotebookEntryPreview>(
      `/notebooks/${notebookId}/entries/preview?sort=${sort}`, onEntries, { signal, flushMs: 60 },
    ),
}
