import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

function HoverLabel({ text }: { text: string }) {
  return (
    <span className="
      pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1
      px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap
      bg-[var(--color-bg-surface)] border border-[var(--color-border)]
      text-[var(--color-text-muted)] shadow-sm
      opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50
    ">
      {text}
    </span>
  )
}

const iconClass = (active?: boolean) => cn(
  'p-2 rounded-lg transition-colors',
  active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)]',
)

interface NavIconProps {
  label: string
  active?: boolean
  children: React.ReactNode
}

/** Icon button with a label appearing below on hover. */
export function NavIconButton({ label, active, onClick, children }: NavIconProps & { onClick: () => void }) {
  return (
    <div className="relative group">
      <button onClick={onClick} aria-label={label} className={iconClass(active)}>{children}</button>
      <HoverLabel text={label} />
    </div>
  )
}

/** Icon link with a label appearing below on hover. */
export function NavIconLink({ to, label, active, children }: NavIconProps & { to: string }) {
  return (
    <div className="relative group">
      <Link to={to} aria-label={label} className={cn(iconClass(active), 'block')}>{children}</Link>
      <HoverLabel text={label} />
    </div>
  )
}
