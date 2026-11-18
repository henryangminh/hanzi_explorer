/** Labelled progress: "done / total (pct%)" over a bar. */
export function ProgressMeter({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total > 0 ? (done / total) * 100 : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-[var(--color-text)]">{label}</span>
        <span className="text-[var(--color-text-muted)] tabular-nums">
          {done.toLocaleString()} / {total.toLocaleString()} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-bg-subtle)] overflow-hidden">
        <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
