import type { RepeatMode } from '@/store/flashcard.store'
import type { FlashcardEntry } from '@/types'

/** Share of a refresh that may be cards the user has already seen. */
const REPEAT_RATIO = 0.1

/** How many cards to request for a mode — filtered modes over-fetch to make up for filtering. */
export function fetchCountFor(mode: RepeatMode, count: number): number {
  return mode === 'random' ? count : count * 3
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

/** Pick `count` cards from a random sample according to the widget's repeat mode. */
export function selectCardsForMode(sample: FlashcardEntry[], mode: RepeatMode, count: number): FlashcardEntry[] {
  const fresh = sample.filter((c) => c.status === null)
  const maxRepeat = Math.max(1, Math.floor(count * REPEAT_RATIO))

  switch (mode) {
    case 'unlearned_only':
      // Only cards explicitly marked not learned
      return sample.filter((c) => c.status === 'not_learned').slice(0, count)
    case 'no_repeat':
      // Only cards never interacted with
      return fresh.slice(0, count)
    case 'repeat_unlearned': {
      // Mostly fresh cards, up to 10% not-learned ones mixed in for review
      const repeated = sample.filter((c) => c.status === 'not_learned').slice(0, maxRepeat)
      return shuffle([...repeated, ...fresh.slice(0, count - repeated.length)])
    }
    case 'random': {
      // Mostly fresh cards, up to 10% of any previously seen ones
      const repeated = sample.filter((c) => c.status !== null).slice(0, maxRepeat)
      return shuffle([...repeated, ...fresh.slice(0, count - repeated.length)])
    }
  }
}
