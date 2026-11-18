import { toLocalDateStr } from '@/lib/date'

function previousDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return toLocalDateStr(new Date(y, m - 1, d - 1))
}

/**
 * Consecutive studied days, counted back from today.
 * A streak still counts when today isn't studied yet (it ends yesterday until today is).
 */
export function countStreak(dates: Set<string>, today: Date = new Date()): number {
  let day = toLocalDateStr(today)
  if (!dates.has(day)) day = previousDay(day)
  let streak = 0
  while (dates.has(day)) {
    streak++
    day = previousDay(day)
  }
  return streak
}

/** The longest run of consecutive studied days ever. */
export function longestStreak(dates: Set<string>): number {
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const day of [...dates].sort()) {
    run = prev !== null && previousDay(day) === prev ? run + 1 : 1
    best = Math.max(best, run)
    prev = day
  }
  return best
}
