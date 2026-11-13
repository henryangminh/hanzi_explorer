import { useState } from 'react'

const EXIT_MS = 200

/**
 * Mount + visibility for an element with enter/exit transitions: `mounted` controls rendering,
 * `visible` flips one frame after mounting (so the enter transition runs) and before unmounting.
 */
export function useAnimatedPresence() {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  function open() {
    setMounted(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }

  function close() {
    setVisible(false)
    setTimeout(() => setMounted(false), EXIT_MS)
  }

  return { mounted, visible, open, close, toggle: () => (mounted ? close() : open()) }
}
