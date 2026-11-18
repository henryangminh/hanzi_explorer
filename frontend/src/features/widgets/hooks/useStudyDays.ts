import { useEffect, useState } from 'react'
import { wotdApi } from '@/api/wotdApi'
import { toLocalDateStr } from '@/lib/date'

/** The days the user studied (marked a words-of-the-day or review card), and recording today as one. */
export function useStudyDays(active: boolean) {
  const [dates, setDates] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (active) wotdApi.studiedDates().then((d) => setDates(new Set(d))).catch(() => {})
  }, [active])

  function markToday() {
    const today = toLocalDateStr()
    if (dates.has(today)) return
    setDates((prev) => new Set(prev).add(today))
    wotdApi.markStudied(today).catch(() => {})
  }

  return { dates, markToday }
}
