import { useState } from 'react'

/** The month a calendar shows, with prev/next navigation. Starts at the current month. */
export function useCalendarMonth() {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const shift = (delta: number) => setMonth((m) => {
    const d = new Date(m.year, m.month + delta)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  return { ...month, prev: () => shift(-1), next: () => shift(1) }
}
