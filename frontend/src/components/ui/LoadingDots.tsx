import { cn } from '@/lib/cn'

/** Three bouncing dots. `small` matches inline text (tab labels), default sits next to a sentence. */
export function LoadingDots({ small = false }: { small?: boolean }) {
  const dot = cn('rounded-full animate-bounce', small ? 'w-1 h-1 bg-current' : 'w-1.5 h-1.5 bg-[var(--color-text-muted)]')
  return (
    <span className={cn('inline-flex items-center shrink-0', small ? 'gap-0.5' : 'gap-1')}>
      <span className={cn(dot, '[animation-delay:-0.3s]')} />
      <span className={cn(dot, '[animation-delay:-0.15s]')} />
      <span className={dot} />
    </span>
  )
}

/** "Still loading more results" line shown under a streaming list. */
export function StreamingIndicator({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5 px-1 text-sm text-[var(--color-text-muted)]', className)}>
      <span>{label}</span>
      <LoadingDots />
    </div>
  )
}
