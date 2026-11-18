import { describe, expect, it } from 'vitest'
import { countStatuses, toggleStatus } from './flashcardStatus'

describe('toggleStatus', () => {
  it('clicking the current status clears it', () => {
    expect(toggleStatus('learned', 'learned')).toBeNull()
  })

  it('clicking another status switches to it', () => {
    expect(toggleStatus('learned', 'not_learned')).toBe('not_learned')
    expect(toggleStatus(undefined, 'learned')).toBe('learned')
  })
})

describe('countStatuses', () => {
  it('counts learned and not learned, ignoring unmarked', () => {
    expect(countStatuses(['learned', 'not_learned', null, 'learned'])).toEqual({ learned: 2, notLearned: 1 })
  })
})
