import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDateShort, toLocalDateStr } from '@/lib/date'
import { useCalendarMonth } from '@/hooks/useCalendarMonth'
import { MiniCalendar } from '@/components/ui/MiniCalendar'

interface WotdDatePickerProps {
  wotdDates: Set<string>
  studiedDates?: Set<string>
  /** null = today's words */
  viewDate: string | null
  onSelectDate: (date: string) => void
  onBackToToday: () => void
  /** Horizontal padding of the toggle rows. */
  rowPaddingClass?: string
  /** Shown left of the date toggle, on the same row (the toggle takes the remaining width). */
  leading?: ReactNode
}

/** "Words of the day" date toggle: shows the viewed date and expands into a calendar of past days. */
export function WotdDatePicker({ wotdDates, studiedDates, viewDate, onSelectDate, onBackToToday, rowPaddingClass = 'px-0.5', leading }: WotdDatePickerProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const calendar = useCalendarMonth()
  const today = toLocalDateStr()

  return (
    <>
      <div className="min-h-7 flex items-center gap-2">
        {leading}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn('flex-1 min-w-0 flex items-center justify-between text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors', rowPaddingClass)}
        >
          <span>
            {viewDate !== null
              ? t('dashboard.viewingDate', { date: formatDateShort(viewDate) })
              : formatDateShort(today)}
          </span>
          <ChevronRight size={13} className={cn('transition-transform duration-200', expanded && 'rotate-90')} />
        </button>
      </div>

      {viewDate !== null && (
        <button
          type="button"
          onClick={onBackToToday}
          className={cn('text-left text-[10px] text-[var(--color-primary)] hover:underline mt-0.5', rowPaddingClass)}
        >
          ← {t('dashboard.backToToday')}
        </button>
      )}

      {expanded && (
        <MiniCalendar
          year={calendar.year}
          month={calendar.month}
          wotdDates={wotdDates}
          studiedDates={studiedDates}
          viewDate={viewDate}
          today={today}
          onSelect={(date) => { onSelectDate(date); setExpanded(false) }}
          onPrevMonth={calendar.prev}
          onNextMonth={calendar.next}
        />
      )}
    </>
  )
}
