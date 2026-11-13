import type { RippleState } from '@/hooks/useRipple'

/** Renders the ripple from useRipple; place inside a `relative overflow-hidden` container. */
export function Ripple({ ripple }: { ripple: RippleState | null }) {
  if (!ripple) return null
  return (
    <span
      key={ripple.key}
      className="fc-ripple"
      style={{ left: ripple.x - 28, top: ripple.y - 28, backgroundColor: ripple.color }}
    />
  )
}
