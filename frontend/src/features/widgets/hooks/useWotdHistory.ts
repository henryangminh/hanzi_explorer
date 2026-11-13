import { useEffect, useState } from 'react'
import { wotdApi } from '@/api/wotdApi'
import { toLocalDateStr } from '@/lib/date'
import type { FlashcardEntry } from '@/types'

/**
 * Browsing past "words of the day": the days that have a record, and the cards of the day
 * being viewed (`viewDate` null = today, i.e. the widget's own cards).
 * `onViewChange` runs whenever the viewed set of cards changes.
 */
export function useWotdHistory(active: boolean, onViewChange: () => void) {
  const [dates, setDates] = useState<Set<string>>(new Set())
  const [viewDate, setViewDate] = useState<string | null>(null)
  const [historyCards, setHistoryCards] = useState<FlashcardEntry[] | null>(null)
  const [loading, setLoading] = useState(false)

  function refreshDates() {
    wotdApi.dates().then((d) => setDates(new Set(d))).catch(() => {})
  }

  useEffect(() => {
    if (active) refreshDates()
  }, [active])

  function backToToday() {
    setViewDate(null)
    setHistoryCards(null)
    onViewChange()
  }

  async function selectDate(date: string) {
    if (date === toLocalDateStr()) {
      backToToday()
      return
    }
    setViewDate(date)
    setHistoryCards(null)
    setLoading(true)
    onViewChange()
    try {
      setHistoryCards(await wotdApi.forDate(date))
    } catch {
      setHistoryCards([])
    } finally {
      setLoading(false)
    }
  }

  return { dates, viewDate, historyCards, loading, refreshDates, selectDate, backToToday }
}
