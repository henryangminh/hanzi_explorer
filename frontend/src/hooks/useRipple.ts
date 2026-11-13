import { useRef, useState } from 'react'

export interface RippleState {
  key: number
  x: number
  y: number
  color: string
  /** Optional id of the element the ripple belongs to (for lists sharing one ripple). */
  target?: string
}

const RIPPLE_DURATION_MS = 560

/** Click ripple: `trigger` starts one at the click position inside `container`. */
export function useRipple() {
  const [ripple, setRipple] = useState<RippleState | null>(null)
  const keyRef = useRef(0)

  function trigger(e: React.MouseEvent, container: Element | null | undefined, color: string, target?: string) {
    const rect = container?.getBoundingClientRect()
    if (!rect) return
    keyRef.current += 1
    setRipple({ key: keyRef.current, x: e.clientX - rect.left, y: e.clientY - rect.top, color, target })
    setTimeout(() => setRipple(null), RIPPLE_DURATION_MS)
  }

  return { ripple, trigger }
}
