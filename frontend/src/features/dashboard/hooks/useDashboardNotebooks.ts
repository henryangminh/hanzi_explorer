import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { notebooksApi } from '@/api/notebooksApi'
import { useFlashcardStore } from '@/store/flashcard.store'
import type { NotebookResponse } from '@/types'

/**
 * All notebooks (widget sources). Once they are loaded, creates the default
 * "words of the day" widget over the HSK notebooks if the user doesn't have it yet.
 */
export function useDashboardNotebooks() {
  const { t } = useTranslation()
  const [notebooks, setNotebooks] = useState<NotebookResponse[]>([])

  useEffect(() => {
    notebooksApi.list()
      .then((data) => {
        setNotebooks(data)
        return data
      })
      .catch(() => [] as NotebookResponse[])
      .then((data) => {
        const { widgets, addWidget } = useFlashcardStore.getState()
        if (widgets.some((w) => w.isDefault)) return
        addWidget({
          name: t('dashboard.wordsOfDay'),
          intervalValue: 1,
          intervalUnit: 'days',
          count: 10,
          notebookIds: data.filter((nb) => nb.name.toUpperCase().includes('HSK')).map((nb) => nb.id),
          isDefault: true,
        })
      })
    // Load once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return notebooks
}
