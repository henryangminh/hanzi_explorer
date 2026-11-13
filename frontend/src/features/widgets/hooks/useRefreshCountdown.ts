import { useEffect, useRef, useState } from 'react'
import { formatCountdown } from '@/lib/date'
import { getIntervalMs, useFlashcardStore, type FlashcardWidgetConfig } from '@/store/flashcard.store'

/**
 * Time left until a custom widget's next refresh ("hh:mm:ss"), ticking every second.
 * Calls `onDue` once when it reaches zero. Inactive for the default (words-of-the-day) widget.
 */
export function useRefreshCountdown(widget: FlashcardWidgetConfig, onDue: (w: FlashcardWidgetConfig) => void): string {
  const [countdown, setCountdown] = useState('')
  const latestOnDue = useRef(onDue)
  useEffect(() => { latestOnDue.current = onDue })

  useEffect(() => {
    if (widget.isDefault) return
    let triggered = false

    const tick = () => {
      if (triggered) return
      // Read the store directly: the interval must see settings changed since the effect started
      const w = useFlashcardStore.getState().widgets.find((x) => x.id === widget.id)
      if (!w || w.notebookIds.length === 0) { setCountdown(''); return }

      const elapsed = w.lastRefreshed ? Date.now() - new Date(w.lastRefreshed).getTime() : Infinity
      const remaining = Math.max(0, getIntervalMs(w.intervalValue, w.intervalUnit) - elapsed)
      if (remaining === 0) {
        triggered = true
        latestOnDue.current(w)
        setCountdown('00:00:00')
        return
      }
      setCountdown(formatCountdown(remaining))
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [widget.id, widget.isDefault, widget.lastRefreshed, widget.intervalValue, widget.intervalUnit])

  return countdown
}
