import { useEffect, useState } from 'react'
import { flashcardsApi } from '@/api/flashcardsApi'
import { useSaveFlashcardStatus } from '@/hooks/useSaveFlashcardStatus'
import type { FlashcardEntry, FlashcardStatus } from '@/types'

/** The user's marked cards. Unmarking a card removes it from the list. */
export function useMarkedFlashcards() {
  const [cards, setCards] = useState<FlashcardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const saveStatus = useSaveFlashcardStatus()

  useEffect(() => {
    flashcardsApi.marked()
      .then(setCards)
      .catch(() => { /* silent */ })
      .finally(() => setLoading(false))
  }, [])

  async function setStatus(char: string, status: FlashcardStatus | null) {
    await saveStatus(char, status)
    setCards((prev) => status === null
      ? prev.filter((c) => c.char !== char)
      : prev.map((c) => c.char === char ? { ...c, status } : c))
  }

  return {
    loading,
    total: cards.length,
    learned: cards.filter((c) => c.status === 'learned'),
    notLearned: cards.filter((c) => c.status === 'not_learned'),
    setStatus,
  }
}
