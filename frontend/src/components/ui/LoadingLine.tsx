import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Spinner + text on one line. */
export function LoadingLine({ text, iconSize = 13, className }: { text: string; iconSize?: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-[var(--color-text-muted)]', className)}>
      <Loader2 size={iconSize} className="animate-spin shrink-0" />
      <span>{text}</span>
    </div>
  )
}
