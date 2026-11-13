import { useEffect, useState } from 'react'
import { notebooksApi } from '@/api/notebooksApi'
import { useNotebookStore } from '@/store/notebook.store'
import type { NotebookResponse, NotebookSortOrder } from '@/types'

/** The notebook list in the chosen order; reloads when entries are added anywhere in the app. */
export function useNotebooks() {
  const version = useNotebookStore((s) => s.version)
  const [notebooks, setNotebooks] = useState<NotebookResponse[]>([])
  const [sort, setSort] = useState<NotebookSortOrder>('updated_at_desc')
  const [loaded, setLoaded] = useState<{ sort: NotebookSortOrder; version: number } | null>(null)

  useEffect(() => {
    notebooksApi.list(sort)
      .then(setNotebooks)
      .finally(() => setLoaded({ sort, version }))
  }, [sort, version])

  return {
    notebooks,
    loading: loaded?.sort !== sort || loaded.version !== version,
    sort,
    setSort,
    add: (nb: NotebookResponse) => setNotebooks((prev) => [nb, ...prev]),
    replace: (nb: NotebookResponse) => setNotebooks((prev) => prev.map((n) => n.id === nb.id ? nb : n)),
    remove: (id: number) => setNotebooks((prev) => prev.filter((n) => n.id !== id)),
    setCounts: (id: number, learned: number, notLearned: number) => setNotebooks((prev) => prev.map((n) =>
      n.id === id ? { ...n, learned_count: learned, not_learned_count: notLearned } : n
    )),
  }
}
