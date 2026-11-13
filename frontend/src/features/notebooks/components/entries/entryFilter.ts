import type { FlashcardStatusMap, NotebookEntryPreview } from '@/types'

export type EntryFilter = 'learned' | 'not_learned' | 'unseen'

export const ALL_ENTRY_FILTERS: EntryFilter[] = ['learned', 'not_learned', 'unseen']

/** Entries whose learned status is one of the selected filters. */
export function filterEntries(
  entries: NotebookEntryPreview[],
  statuses: FlashcardStatusMap,
  filters: Set<EntryFilter>,
): NotebookEntryPreview[] {
  if (filters.size === ALL_ENTRY_FILTERS.length) return entries
  return entries.filter((e) => filters.has(statuses[e.char] ?? 'unseen'))
}
