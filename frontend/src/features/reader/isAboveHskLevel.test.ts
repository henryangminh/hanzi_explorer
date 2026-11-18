import { describe, expect, it } from 'vitest'
import type { ReaderToken } from '@/types'
import { isAboveHskLevel } from './isAboveHskLevel'

const word = (hsk: ReaderToken['hsk'], w: string | null = '银行'): ReaderToken =>
  ({ text: w ?? '，', word: w, pinyin: null, status: null, hsk })

describe('isAboveHskLevel', () => {
  it('is off without a level', () => {
    expect(isAboveHskLevel(word({}), 'newest', null)).toBe(false)
  })
  it('compares the level in the chosen standard', () => {
    const token = word({ old: 3, newest: 5 })
    expect(isAboveHskLevel(token, 'newest', 4)).toBe(true)
    expect(isAboveHskLevel(token, 'newest', 5)).toBe(false)
    expect(isAboveHskLevel(token, 'old', 4)).toBe(false)
  })
  it('counts words outside the list as above any level', () => {
    expect(isAboveHskLevel(word({ old: 3 }), 'new', 7)).toBe(true)
  })
  it('never highlights punctuation', () => {
    expect(isAboveHskLevel(word({}, null), 'newest', 1)).toBe(false)
  })
})
