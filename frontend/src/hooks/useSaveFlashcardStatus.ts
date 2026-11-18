import { flashcardsApi } from '@/api/flashcardsApi'
import { reviewApi } from '@/api/reviewApi'
import { toLocalDateStr } from '@/lib/date'
import { useFlashcardStore } from '@/store/flashcard.store'
import type { FlashcardStatus } from '@/types'

/**
 * Persist a word's learned status and mirror it in every dashboard widget that shows the word.
 * Marking "not learned" also (re)starts the word's spaced review, anything else takes it out —
 * except in a review session (`scheduleReview: false`), whose answers move the schedule themselves.
 */
export function useSaveFlashcardStatus({ scheduleReview = true }: { scheduleReview?: boolean } = {}) {
  const { widgets, updateCardStatus } = useFlashcardStore()

  return async (char: string, status: FlashcardStatus | null) => {
    for (const w of widgets) {
      if (w.cards.some((c) => c.char === char)) updateCardStatus(w.id, char, status)
    }
    try {
      await flashcardsApi.setStatus(char, status)
      if (!scheduleReview) return
      if (status === 'not_learned') await reviewApi.schedule(char, toLocalDateStr())
      else await reviewApi.unschedule(char)
    } catch { /* optimistic update stays */ }
  }
}
