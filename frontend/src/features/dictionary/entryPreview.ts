import type { DictLiteResponse } from '@/types'

export interface EntryPreview {
  pinyin: string | null
  traditional: string | null
  meaning: string | null
}

/** What the collapsed card shows: first reading, traditional form and first meaning from any source. */
export function entryPreview(entry: DictLiteResponse): EntryPreview {
  const cedict = entry.cedict[0] ?? null
  const cvdict = entry.cvdict?.[0] ?? null
  const xdhy = entry.xdhy?.[0] ?? null
  return {
    pinyin: cedict?.pinyin ?? cvdict?.pinyin ?? xdhy?.pinyin ?? null,
    traditional: cedict?.traditional ?? cvdict?.traditional ?? xdhy?.traditional ?? null,
    meaning: cedict?.meaning_en
      ?? (cvdict ? cvdict.meaning_vi.split('/').filter(Boolean)[0]?.trim() : null)
      ?? (xdhy ? xdhy.defs.find((d) => !d.is_sub)?.definition : null)
      ?? null,
  }
}
