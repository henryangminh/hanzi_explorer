import { useRef, useState } from 'react'

const EXIT_ANIMATION_MS = 230

/**
 * Index + enter/exit animation state for a looping card carousel.
 * Render the current card with `key={enterKey}` and `className={cn(entering && enterClass, exitClass)}`,
 * calling `onAnimationEnd` when its animation finishes.
 */
export function useCardCarousel(total: number, initialIndex = 0, initiallyEntering = false) {
  const [index, setIndex] = useState(initialIndex)
  const [exitClass, setExitClass] = useState('')
  const [enterKey, setEnterKey] = useState(0)
  const [entering, setEntering] = useState(initiallyEntering)
  const animating = useRef(false)

  function replay() {
    setEnterKey((k) => k + 1)
    setEntering(true)
  }

  /** Jump to an index without the exit animation (e.g. after loading new cards). */
  function reset(to = 0) {
    setIndex(to)
    replay()
  }

  function go(dir: 'next' | 'prev', beforeMove?: () => void) {
    if (animating.current || total === 0) return
    animating.current = true
    setExitClass(dir === 'next' ? 'fc-exit-next' : 'fc-exit-prev')
    beforeMove?.()
    setTimeout(() => {
      setIndex((i) => dir === 'next' ? (i + 1) % total : (i - 1 + total) % total)
      setExitClass('')
      replay()
      animating.current = false
    }, EXIT_ANIMATION_MS)
  }

  return {
    safeIndex: total > 0 ? index % total : 0,
    setIndex,
    go,
    reset,
    exitClass,
    enterKey,
    entering,
    onAnimationEnd: () => setEntering(false),
  }
}
