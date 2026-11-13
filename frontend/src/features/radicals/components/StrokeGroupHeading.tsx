/** "4 nét · 12 bộ" heading above a group of items with the same stroke count. */
export function StrokeGroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">{children}</p>
  )
}
