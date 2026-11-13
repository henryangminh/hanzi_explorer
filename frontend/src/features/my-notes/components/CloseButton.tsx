import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export function CloseButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn('p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors', className)}
    >
      <X size={15} />
    </button>
  )
}
