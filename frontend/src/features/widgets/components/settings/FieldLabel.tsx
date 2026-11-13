export function FieldLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5 ${className ?? ''}`}>
      {children}
    </label>
  )
}

export const FIELD_INPUT = 'text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent'
export const NO_SPINNER = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
