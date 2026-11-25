import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

const ARROW = 'p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors'

/** Prev / dots / next controls under a carousel. */
export function CarouselDots({ count, active, onNav }: { count: number; active: number; onNav: (dir: 'prev' | 'next') => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center gap-3">
      <button type="button" onClick={() => onNav('prev')} aria-label={t('common.previous')} className={ARROW}>
        <ChevronLeft size={18} />
      </button>
      <div className="flex gap-2">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className={cn('w-1.5 h-1.5 rounded-full transition-colors', i === active ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]')}
          />
        ))}
      </div>
      <button type="button" onClick={() => onNav('next')} aria-label={t('common.next')} className={ARROW}>
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
