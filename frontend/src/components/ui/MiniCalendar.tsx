import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface MiniCalendarProps {
  year: number
  month: number
  wotdDates: Set<string>
  viewDate: string | null
  today: string
  onSelect: (date: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

export function MiniCalendar({ year, month, wotdDates, viewDate, today, onSelect, onPrevMonth, onNextMonth }: MiniCalendarProps) {
  const { i18n } = useTranslation()
  const isVi = i18n.language === 'vi'

  const monthLabel = new Date(year, month).toLocaleDateString(
    isVi ? 'vi-VN' : 'en-US',
    { month: 'long', year: 'numeric' },
  )

  const dayHeaders = isVi
    ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
    : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const selected = viewDate ?? today

  return (
    <div className="mt-2 select-none">
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={onPrevMonth}
          className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="text-[11px] font-medium text-[var(--color-text)] capitalize">{monthLabel}</span>
        <button
          type="button"
          onClick={onNextMonth}
          className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-0.5">
        {dayHeaders.map((d) => (
          <span key={d} className="text-center text-[9px] font-medium text-[var(--color-text-muted)] py-0.5">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`pad-${i}`} />

          const isToday = dateStr === today
          const isSelected = dateStr === selected
          const hasWOTD = wotdDates.has(dateStr)
          const isFuture = dateStr > today
          const isClickable = (hasWOTD || isToday) && !isFuture

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => isClickable && onSelect(dateStr)}
              disabled={!isClickable}
              className={cn(
                'relative flex flex-col items-center justify-center h-6 rounded transition-colors text-[10px] w-full',
                isSelected && 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-semibold',
                !isSelected && isToday && 'ring-1 ring-[var(--color-primary)] text-[var(--color-primary)] font-semibold',
                !isSelected && !isToday && isClickable && 'text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]',
                !isClickable && 'text-[var(--color-border-md)] cursor-default',
              )}
            >
              {parseInt(dateStr.slice(-2), 10)}
              {hasWOTD && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--color-primary)]" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
