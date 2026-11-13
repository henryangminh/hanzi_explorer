import { useState } from 'react'

const HIDE_ANIMATION_MS = 200

/** Show/hide with a hide animation: while `hiding`, render with the `fc-hide` class. */
export function useRevealToggle() {
  const [shown, setShown] = useState(false)
  const [hiding, setHiding] = useState(false)

  function toggle() {
    if (shown) {
      setHiding(true)
      setTimeout(() => { setShown(false); setHiding(false) }, HIDE_ANIMATION_MS)
    } else {
      setShown(true)
    }
  }

  function reset() {
    setHiding(false)
    setShown(false)
  }

  return { shown, hiding, toggle, reset }
}
