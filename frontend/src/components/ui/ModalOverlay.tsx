import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

interface ModalOverlayProps {
  onClose: () => void
  children: React.ReactNode
  /** Backdrop extras: color, padding, alignment (defaults to a centered, dimmed backdrop). */
  className?: string
}

/** Open overlays, innermost last: Escape closes only the top one. */
const openOverlays: object[] = []

/** Full-screen backdrop below the navbar; clicking the backdrop itself or pressing Escape closes the modal. */
export function ModalOverlay({ onClose, children, className }: ModalOverlayProps) {
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    const self = {}
    openOverlays.push(self)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openOverlays[openOverlays.length - 1] === self) onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      openOverlays.splice(openOverlays.indexOf(self), 1)
    }
  }, [])

  return (
    <div
      className={cn('fixed top-14 inset-x-0 bottom-0 z-[39] flex items-center justify-center', className ?? 'bg-black/50')}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}
