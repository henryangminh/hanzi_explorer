import { describe, expect, it } from 'vitest'
import { countStreak, longestStreak } from './streak'

const today = new Date(2026, 10, 18)  // 2026-11-18

describe('countStreak', () => {
  it('counts consecutive days ending today', () => {
    expect(countStreak(new Set(['2026-11-16', '2026-11-17', '2026-11-18']), today)).toBe(3)
  })

  it('still counts a streak that ends yesterday (today not studied yet)', () => {
    expect(countStreak(new Set(['2026-11-16', '2026-11-17']), today)).toBe(2)
  })

  it('is 0 once a whole day is missed', () => {
    expect(countStreak(new Set(['2026-11-15', '2026-11-16']), today)).toBe(0)
  })

  it('crosses month and year boundaries', () => {
    expect(countStreak(new Set(['2025-12-31', '2026-01-01']), new Date(2026, 0, 1))).toBe(2)
  })
})

describe('longestStreak', () => {
  it('finds the longest run, whatever the order of dates', () => {
    const dates = new Set(['2026-11-18', '2026-10-01', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-17'])
    expect(longestStreak(dates)).toBe(3)
  })

  it('is 0 with no dates', () => {
    expect(longestStreak(new Set())).toBe(0)
  })
})
