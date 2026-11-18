import { useEffect, useState } from 'react'
import { reviewApi } from '@/api/reviewApi'
import { useSaveFlashcardStatus } from '@/hooks/useSaveFlashcardStatus'
import { toLocalDateStr } from '@/lib/date'
import type { FlashcardEntry, FlashcardStatus } from '@/types'

/**
 * Spaced review of words-of-the-day words marked "not learned": the cards due today,
 * answering them, and keeping the schedule in step with the words-of-the-day marks.
 * `onStudied` runs when a review card is answered.
 */
export function useReview(active: boolean, onStudied: () => void) {
  const saveStatus = useSaveFlashcardStatus()
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

  /** A words-of-the-day card was marked: "not learned" schedules it for review, anything else takes it out. */
  function trackWotdStatus(char: string, status: FlashcardStatus | null) {
    const request = status === 'not_learned' ? reviewApi.schedule(char, toLocalDateStr()) : reviewApi.unschedule(char)
    request.then(refresh).catch(() => {})
  }

  return { cards, refresh, answer, trackWotdStatus }
}
