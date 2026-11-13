import { normalizePinyin } from '@/lib/pinyin'
import type { DictionaryResponse, DictLiteResponse } from '@/types'

export type InitialEntry = DictLiteResponse | DictionaryResponse

export function isFullEntry(e: InitialEntry): e is DictionaryResponse {
  return 'external' in e
}

/** A lite (DB-only) entry in the full-entry shape, with nothing from external sources yet. */
export function liteAsFull(lite: DictLiteResponse): DictionaryResponse {
  return {
    char: lite.char,
    cedict: lite.cedict,
    cvdict: lite.cvdict,
    xdhy: lite.xdhy ?? [],
    sino_vn: lite.sino_vn,
    external: [],
    user_notes: [],
    hsk_tags: lite.hsk_tags ?? [],
    hanzipy: null,
    synonyms: lite.synonyms ?? [],
    antonyms: lite.antonyms ?? [],
  }
}

/** Keep only the parts of an entry for one reading (items without a reading are kept). */
export function filterByPinyin(entry: DictionaryResponse, pinyin: string): DictionaryResponse {
  const target = pinyin.toLowerCase()
  const matches = (item: { pinyin?: string }) => !item.pinyin || normalizePinyin(item.pinyin) === target
  return {
    ...entry,
    cedict: entry.cedict.filter(matches),
    cvdict: entry.cvdict?.filter(matches) || [],
    xdhy: entry.xdhy?.filter(matches) || [],
    synonyms: entry.synonyms?.filter(matches) || [],
    antonyms: entry.antonyms?.filter(matches) || [],
  }
}

/** Traditional form and best pinyin for coloring the heading (spaced cedict/cvdict pinyin first). */
export function headwordInfo(entry: DictionaryResponse): { traditional: string | null; pinyin: string | null } {
  const first = entry.cedict[0] ?? entry.cvdict?.[0] ?? entry.xdhy?.[0]
  return {
    traditional: entry.cedict[0]?.traditional ?? entry.cvdict?.[0]?.traditional ?? entry.xdhy?.[0]?.traditional ?? null,
    pinyin: first?.pinyin ?? null,
  }
}

/** True when any source (local or Wiktionary) has something for the word. */
export function hasAnyData(entry: DictionaryResponse, full: DictionaryResponse | null): boolean {
  return entry.cedict.length > 0
    || (entry.cvdict?.length ?? 0) > 0
    || (entry.xdhy?.length ?? 0) > 0
    || (full?.external?.some((src) => (src.data as { found?: boolean })?.found) ?? false)
}
