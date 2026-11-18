import { useEffect, useState } from 'react'
import { reviewApi } from '@/api/reviewApi'
import { useSaveFlashcardStatus } from '@/hooks/useSaveFlashcardStatus'
import { toLocalDateStr } from '@/lib/date'
import type { FlashcardEntry, FlashcardStatus } from '@/types'

/**
 * Spaced review of the words marked "not learned": the cards due today and answering them.
 * `onStudied` runs when a review card is answered.
 */
export function useReview(active: boolean, onStudied: () => void) {
  const saveStatus = useSaveFlashcardStatus({ scheduleReview: false })
  const [cards, setCards] = useState<FlashcardEntry[]>([])

  function refresh() {
    reviewApi.due(toLocalDateStr()).then(setCards).catch(() => {})
  }

  useEffect(() => {
    if (active) refresh()
  }, [active])

  /** A card marked during a review session (answered cards stay until the session is refreshed). */
  function answer(char: string, status: FlashcardStatus | null) {
    setCards((prev) => prev.map((c) => (c.char === char ? { ...c, status } : c)))
    saveStatus(char, status)
    if (status === null) return
    onStudied()
    reviewApi.answer(char, toLocalDateStr(), status === 'learned').catch(() => {})
  }

  return { cards, refresh, answer }
}
