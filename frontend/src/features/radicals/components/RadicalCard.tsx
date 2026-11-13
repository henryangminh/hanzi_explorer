import { cn } from '@/lib/cn'
import type { RadicalSummary } from '@/types'
import { TILE } from './tileStyles'

/** Variant forms ('人,亻') are shown together; long lists get a smaller font. */
function radicalFontSize(display: string): string {
  if (display.length >= 5) return 'text-lg'
  if (display.length >= 3) return 'text-2xl'
  return 'text-3xl'
}

export function RadicalCard({ radical, onClick }: { radical: RadicalSummary; onClick: () => void }) {
  const display = radical.radical.split(',').join('、')
  return (
    <button onClick={onClick} className={cn('flex flex-col items-center gap-1 p-3', TILE, 'rounded-2xl')}>
      <span className={cn('font-cjk text-[var(--color-text)] leading-none mt-1', radicalFontSize(display))}>{display}</span>
      <span className="text-xs text-[var(--color-primary)] font-medium">{radical.pinyin}</span>
      <span className="text-xs text-[var(--color-text-muted)] text-center leading-tight line-clamp-1">
        {radical.meaning_en ?? radical.meaning_vi}
      </span>
    </button>
  )
}
