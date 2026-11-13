import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import type { IntervalUnit } from '@/store/flashcard.store'
import { FieldLabel, NO_SPINNER } from './FieldLabel'

const UNITS: IntervalUnit[] = ['minutes', 'hours', 'days']

interface IntervalFieldProps {
  value: number
  unit: IntervalUnit
  /** The words-of-the-day widget always refreshes daily. */
  locked: boolean
  onValueChange: (v: number) => void
  onUnitChange: (u: IntervalUnit) => void
}

/** Number + unit picker for how often a widget refreshes. */
export function IntervalField({ value, unit, locked, onValueChange, onUnitChange }: IntervalFieldProps) {
  const { t } = useTranslation()
  return (
    <>
      <FieldLabel>{t('dashboard.interval')}</FieldLabel>
      <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:border-transparent w-full">
        <input
          type="number"
          min={1}
          value={value}
          disabled={locked}
          onChange={(e) => onValueChange(Math.max(1, parseInt(e.target.value) || 1))}
          className={`flex-1 min-w-0 pl-3 pr-1 py-2 text-sm bg-transparent text-[var(--color-text)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${NO_SPINNER}`}
        />
        <label className={`relative flex items-center justify-end gap-1 pr-3 pl-1 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <span>{t(`dashboard.${unit}`).toLowerCase()}</span>
          <ChevronDown size={16} />
          <select
            value={unit}
            disabled={locked}
            onChange={(e) => onUnitChange(e.target.value as IntervalUnit)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          >
            {UNITS.map((u) => <option key={u} value={u}>{t(`dashboard.${u}`)}</option>)}
          </select>
        </label>
      </div>
      <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
        {t(locked ? 'dashboard.defaultIntervalHint' : 'dashboard.minIntervalHint')}
      </p>
    </>
  )
}
