import { getIntervalMs, type IntervalUnit } from '@/store/flashcard.store'

const MIN_INTERVAL_MS = 30 * 60 * 1000

/** i18n key of the first problem with the settings, or null when they are valid. */
export function settingsErrorKey(name: string, intervalValue: number, intervalUnit: IntervalUnit, count: number): string | null {
  if (!name.trim()) return 'dashboard.errorName'
  if (getIntervalMs(intervalValue, intervalUnit) < MIN_INTERVAL_MS) return 'dashboard.minIntervalWarning'
  if (count < 1) return 'dashboard.errorCount'
  return null
}
