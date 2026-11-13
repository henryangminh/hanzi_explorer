import { useEffect, useState } from 'react'
import { flashcardsApi } from '@/api/flashcardsApi'
import { countStatuses } from '@/lib/flashcardStatus'
import { useSaveFlashcardStatus } from '@/hooks/useSaveFlashcardStatus'
import type { FlashcardStatus, FlashcardStatusMap, NotebookEntryPreview } from '@/types'

/**
 * Learned statuses of a notebook's words, fetched once all entries have streamed in.
 * `onCountsChange` receives the learned / not-learned totals after every change.
 */
export function useEntryStatuses(
  entries: NotebookEntryPreview[],
  loading: boolean,
  onCountsChange?: (learned: number, notLearned: number) => void,
) {
  const [statuses, setStatuses] = useState<FlashcardStatusMap>({})
  const saveStatus = useSaveFlashcardStatus()

  function apply(next: FlashcardStatusMap) {
    setStatuses(next)
    const { learned, notLearned } = countStatuses(Object.values(next))
    onCountsChange?.(learned, notLearned)
  }

  useEffect(() => {
    if (loading || entries.length === 0) return
    flashcardsApi.statuses(entries.map((e) => e.char)).then(apply).catch(() => {})
    // Only when the stream completes (or its size changes) — not on every parent re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, entries.length])

  function setStatus(char: string, status: FlashcardStatus | null) {
    apply({ ...statuses, [char]: status })
    saveStatus(char, status)
  }

  return { statuses, setStatus }
}
