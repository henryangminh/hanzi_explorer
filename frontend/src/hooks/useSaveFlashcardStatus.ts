import { flashcardsApi } from '@/api/flashcardsApi'
import { useFlashcardStore } from '@/store/flashcard.store'
import type { FlashcardStatus } from '@/types'

/** Persist a word's learned status and mirror it in every dashboard widget that shows the word. */
export function useSaveFlashcardStatus() {
  const { widgets, updateCardStatus } = useFlashcardStore()

  return async (char: string, status: FlashcardStatus | null) => {
    for (const w of widgets) {
      if (w.cards.some((c) => c.char === char)) updateCardStatus(w.id, char, status)
    }
    try {
      await flashcardsApi.setStatus(char, status)
    } catch { /* optimistic update stays */ }
  }
}
