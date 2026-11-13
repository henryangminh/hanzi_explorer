import { cn } from '@/lib/cn'

interface ModalOverlayProps {
  onClose: () => void
  children: React.ReactNode
  /** Backdrop extras: color, padding, alignment (defaults to a centered, dimmed backdrop). */
  className?: string
}

/** Full-screen backdrop below the navbar; clicking the backdrop itself closes the modal. */
export function ModalOverlay({ onClose, children, className }: ModalOverlayProps) {
  return (
    <div
      className={cn('fixed top-14 inset-x-0 bottom-0 z-[39] flex items-center justify-center', className ?? 'bg-black/50')}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}
