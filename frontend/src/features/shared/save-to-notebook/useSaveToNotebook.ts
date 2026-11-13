import { useEffect, useState } from 'react'
import { notebooksApi } from '@/api/notebooksApi'
import { getErrorStatus } from '@/lib/axios'
import { useNotebookStore } from '@/store/notebook.store'
import type { NotebookResponse, NotebookSortOrder } from '@/types'
import type { SaveFeedback } from './NotebookPickItem'

/** The user's private notebooks (minus `excludeId`) and saving `char` into one of them. */
export function useSaveToNotebook(char: string, excludeId?: number) {
  const invalidateNotebooks = useNotebookStore((s) => s.invalidate)
  const [notebooks, setNotebooks] = useState<NotebookResponse[]>([])
  const [sort, setSort] = useState<NotebookSortOrder>('updated_at_desc')
  const [loadedSort, setLoadedSort] = useState<NotebookSortOrder | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ id: number; type: SaveFeedback } | null>(null)

  useEffect(() => {
    notebooksApi.list(sort)
      .then((data) => setNotebooks(data.filter((n) => n.type === 'private' && n.id !== excludeId)))
      .finally(() => setLoadedSort(sort))
  }, [sort, excludeId, reloadKey])

  async function save(notebook: NotebookResponse) {
    setSavingId(notebook.id)
    setFeedback(null)
    try {
      await notebooksApi.addEntry(notebook.id, char)
      setFeedback({ id: notebook.id, type: 'ok' })
      setNotebooks((prev) => prev.map((n) => (n.id === notebook.id ? { ...n, entry_count: n.entry_count + 1 } : n)))
      invalidateNotebooks() // let the notebooks page re-fetch
    } catch (err) {
      if (getErrorStatus(err) === 409) setFeedback({ id: notebook.id, type: 'dup' })
    } finally {
      setSavingId(null)
    }
  }

  return {
    notebooks,
    loading: loadedSort !== sort,
    sort,
    setSort,
    reload: () => setReloadKey((k) => k + 1),
    save,
    savingId,
    feedbackFor: (id: number) => (feedback?.id === id ? feedback.type : null),
  }
}
