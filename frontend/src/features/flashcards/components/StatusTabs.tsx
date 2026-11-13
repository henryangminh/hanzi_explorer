import { cn } from '@/lib/cn'

export interface StatusTab<K extends string> {
  key: K
  label: string
  count: number
}

/** Underlined tabs with a count badge. */
export function StatusTabs<K extends string>({ tabs, active, onChange }: {
  tabs: StatusTab<K>[]
  active: K
  onChange: (key: K) => void
}) {
  return (
    <div className="flex border-b border-[var(--color-border)] mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            active === tab.key
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
          )}
        >
          {tab.label}
          <span className={cn(
            'ml-2 text-xs px-1.5 py-0.5 rounded-full',
            active === tab.key
              ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
              : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]',
          )}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  )
}
