import { useEffect, useState } from 'react'
import { notebooksApi } from '@/api/notebooksApi'
import type { NotebookEntryPreview, NotebookSortOrder } from '@/types'

interface Loaded {
  key: string
  entries: NotebookEntryPreview[]
  done: boolean
}

/** A notebook's entries, streamed in as the server produces them; a new `version` streams them again. */
export function useNotebookEntries(notebookId: number, sort: NotebookSortOrder, version = 0) {
  const key = `${notebookId}:${sort}:${version}`
  // Data is tagged with the (notebook, sort) it belongs to, so a change shows an empty list at once
  const [loaded, setLoaded] = useState<Loaded>({ key: '', entries: [], done: false })

  useEffect(() => {
    const controller = new AbortController()
    const append = (batch: NotebookEntryPreview[]) => setLoaded((prev) => ({
      key,
      entries: prev.key === key ? [...prev.entries, ...batch] : batch,
      done: false,
    }))
    notebooksApi.streamEntries(notebookId, sort, append, controller.signal)
      .catch(() => { /* aborted or failed: keep what arrived */ })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoaded((prev) => ({ key, entries: prev.key === key ? prev.entries : [], done: true }))
        }
      })
    return () => controller.abort()
  }, [notebookId, sort, key])

  const current = loaded.key === key
  return {
    entries: current ? loaded.entries : [],
    loading: !(current && loaded.done),
    removeLocal: (entryId: number) => setLoaded((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.id !== entryId) })),
  }
}
