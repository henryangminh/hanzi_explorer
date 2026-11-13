import { useEffect, useRef } from 'react'
import { toLocalDateStr } from '@/lib/date'

const CHECK_INTERVAL_MS = 60_000

/** Call `onNewDay` when the local date changes (checked every minute) while `active`. */
export function useDayChange(active: boolean, onNewDay: () => void) {
  const latest = useRef(onNewDay)
  useEffect(() => { latest.current = onNewDay })

  useEffect(() => {
    if (!active) return
    let today = toLocalDateStr()
    const timer = setInterval(() => {
      const now = toLocalDateStr()
      if (now !== today) {
        today = now
        latest.current()
      }
    }, CHECK_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [active])
}
