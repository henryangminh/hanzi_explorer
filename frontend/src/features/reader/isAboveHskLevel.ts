import type { HskStandard, ReaderToken } from '@/types'

/** Whether a word is harder than `level`: above it in `standard`, or not in that HSK list at all. */
export function isAboveHskLevel(token: ReaderToken, standard: HskStandard, level: number | null): boolean {
  if (level === null || !token.word) return false
  const wordLevel = token.hsk[standard]
  return wordLevel === undefined || wordLevel > level
}
