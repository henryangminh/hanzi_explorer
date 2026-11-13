import { useState } from 'react'
import { flashcardsApi } from '@/api/flashcardsApi'
import { wotdApi } from '@/api/wotdApi'
import { toLocalDateStr } from '@/lib/date'
import { useFlashcardStore, type FlashcardWidgetConfig } from '@/store/flashcard.store'
import { fetchCountFor, selectCardsForMode } from '../selectCards'

function currentConfig(widgetId: string): FlashcardWidgetConfig | undefined {
  return useFlashcardStore.getState().widgets.find((w) => w.id === widgetId)
}

/**
 * Loading a widget's cards into the store.
 * - `refreshCustom`: a fresh sample filtered by the widget's repeat mode.
 * - `ensureTodaysWords`: the default widget's words of the day — fetched once per day and
 *   recorded server-side so past days can be browsed (and restored on other devices).
 * Both resolve to true when new cards were stored.
 */
export function useWidgetCards(widgetId: string) {
  const setWidgetCards = useFlashcardStore((s) => s.setWidgetCards)
  const [loading, setLoading] = useState(false)

  async function refreshCustom(notebookIds: number[], count: number): Promise<boolean> {
    if (notebookIds.length === 0) {
      setWidgetCards(widgetId, [])
      return true
    }
    setLoading(true)
    try {
      const mode = currentConfig(widgetId)?.repeatMode ?? 'random'
      const sample = await flashcardsApi.sample(notebookIds, fetchCountFor(mode, count))
      setWidgetCards(widgetId, selectCardsForMode(sample, mode, count))
      return true
    } catch {
      return false
    } finally {
      setLoading(false)
    }
  }

  async function ensureTodaysWords(): Promise<boolean> {
    const w = currentConfig(widgetId)
    if (!w) return false
    const today = toLocalDateStr()
    const storedDate = w.lastRefreshed ? toLocalDateStr(new Date(w.lastRefreshed)) : null

    if (storedDate === today && w.cards.length > 0) {
      // Already have today's cards — still make sure the server has the record (idempotent)
      await wotdApi.save(today, w.cards.map((c) => c.char)).catch(() => {})
      return false
    }
    if (w.notebookIds.length === 0) return false

    setLoading(true)
    try {
      // Today's words may already exist (other device, cleared cache): reuse them, else draw new ones
      const saved = await wotdApi.forDate(today).catch(() => null)
      if (saved?.length) {
        setWidgetCards(widgetId, saved)
        return true
      }
      const cards = await flashcardsApi.sample(w.notebookIds, w.count)
      setWidgetCards(widgetId, cards)
      await wotdApi.save(today, cards.map((c) => c.char))
      return true
    } catch {
      return false
    } finally {
      setLoading(false)
    }
  }

  return { loading, refreshCustom, ensureTodaysWords }
}
