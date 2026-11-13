import type { TFunction } from 'i18next'
import type { SelectOption } from '@/components/ui/Select'
import type { NotebookSortOrder } from '@/types'

const SORT_LABEL_KEYS: Record<NotebookSortOrder, string> = {
  updated_at_desc: 'notebooks.sortUpdatedDesc',
  updated_at_asc: 'notebooks.sortUpdatedAsc',
  name_asc: 'notebooks.sortNameAsc',
  name_desc: 'notebooks.sortNameDesc',
  created_at_desc: 'notebooks.sortCreatedDesc',
  created_at_asc: 'notebooks.sortCreatedAsc',
}

export function sortOptions(t: TFunction): SelectOption<NotebookSortOrder>[] {
  return (Object.keys(SORT_LABEL_KEYS) as NotebookSortOrder[]).map((value) => ({ value, label: t(SORT_LABEL_KEYS[value]) }))
}
