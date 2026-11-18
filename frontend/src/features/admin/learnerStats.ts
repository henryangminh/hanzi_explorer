import { toLocalDateStr } from '@/lib/date'

/** Whether any of the dates falls within the last `days` days, today included. */
export function studiedWithin(dates: string[], days: number, today: Date = new Date()): boolean {
  const since = toLocalDateStr(new Date(today.getFullYear(), today.getMonth(), today.getDate() - days + 1))
  return dates.some((d) => d >= since)
}
