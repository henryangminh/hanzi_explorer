import { useEffect, useState } from 'react'
import { flashcardsApi } from '@/api/flashcardsApi'
import { useSaveFlashcardStatus } from '@/hooks/useSaveFlashcardStatus'
import type { SearchTab } from '@/store/dictionary.store'
import type { FlashcardStatus, FlashcardStatusMap } from '@/types'

/** Learned statuses of the words in the active tab, fetched when its search finishes. */
export function useResultStatuses(activeTab: SearchTab | null, enabled: boolean) {
  const [statuses, setStatuses] = useState<FlashcardStatusMap>({})
  const saveStatus = useSaveFlashcardStatus()

  useEffect(() => {
    if (!enabled || !activeTab || activeTab.loading || activeTab.results.length === 0) return
    const chars = [...new Set(activeTab.results.map((r) => r.char))]
    flashcardsApi.statuses(chars)
      .then((data) => setStatuses((prev) => ({ ...prev, ...data })))
      .catch(() => {})
    // Refetch per tab and when its search completes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.id, activeTab?.loading])

  function setStatus(char: string, status: FlashcardStatus | null) {
    setStatuses((prev) => ({ ...prev, [char]: status }))
    saveStatus(char, status)
  }

  return { statuses, setStatus }
}
