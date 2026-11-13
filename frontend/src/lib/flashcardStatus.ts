import type { FlashcardStatus } from '@/types'

/** Clicking the button of the current status clears it; otherwise it sets the clicked one. */
export function toggleStatus(current: FlashcardStatus | null | undefined, clicked: FlashcardStatus): FlashcardStatus | null {
  return current === clicked ? null : clicked
}

/** Card background class for a status (see globals.css), undefined when unmarked. */
export function statusClass(status: FlashcardStatus | null | undefined): string | undefined {
  if (status === 'learned') return 'fc-status-learned'
  if (status === 'not_learned') return 'fc-status-not_learned'
  return undefined
}

export const STATUS_RIPPLE_COLOR: Record<FlashcardStatus, string> = {
  learned: 'rgba(16,185,129,0.35)',
  not_learned: 'rgba(239,68,68,0.35)',
}

export function countStatuses(statuses: Iterable<FlashcardStatus | null>): { learned: number; notLearned: number } {
  let learned = 0
  let notLearned = 0
  for (const s of statuses) {
    if (s === 'learned') learned++
    else if (s === 'not_learned') notLearned++
  }
  return { learned, notLearned }
}
