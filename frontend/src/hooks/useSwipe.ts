import { useRef } from 'react'

const SWIPE_THRESHOLD_PX = 40

/** Horizontal swipe detection: spread the returned handlers on the swipeable element. */
export function useSwipe(onSwipe: (dir: 'next' | 'prev') => void) {
  const startX = useRef<number | null>(null)

  return {
    onTouchStart: (e: React.TouchEvent) => { startX.current = e.touches[0].clientX },
    onTouchEnd: (e: React.TouchEvent) => {
      if (startX.current === null) return
      const delta = e.changedTouches[0].clientX - startX.current
      if (Math.abs(delta) > SWIPE_THRESHOLD_PX) onSwipe(delta < 0 ? 'next' : 'prev')
      startX.current = null
    },
  }
}
