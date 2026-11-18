import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

interface StatTileProps {
  label: string
  value: number
  hint?: string
  /** Makes the tile a link. */
  to?: string
}

const TILE = 'flex flex-col gap-1 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]'

export function StatTile({ label, value, hint, to }: StatTileProps) {
  const body = (
    <>
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <span className="text-2xl font-semibold text-[var(--color-text)]">{value.toLocaleString()}</span>
      {hint && <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>}
    </>
  )
  return to
    ? <Link to={to} className={cn(TILE, 'hover:border-[var(--color-primary)] transition-colors')}>{body}</Link>
    : <div className={TILE}>{body}</div>
}
