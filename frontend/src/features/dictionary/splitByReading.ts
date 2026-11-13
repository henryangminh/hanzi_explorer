import { normalizePinyin } from '@/lib/pinyin'
import type { DictLiteResponse } from '@/types'

export interface ReadingResult {
  key: string
  entry: DictLiteResponse
  /** Normalized reading the card is limited to; undefined when the word has no readings. */
  pinyinFilter?: string
}

/** Hán Việt of one reading (上: shǎng → thướng, shàng → thượng). Without per-reading data, the
 *  word-level value is only safe to show when the word has a single reading. */
function sinoVnForReading(entry: DictLiteResponse, reading: string, readingCount: number): string[] {
  const match = Object.entries(entry.sino_vn_by_reading ?? {}).find(([pinyin]) => normalizePinyin(pinyin) === reading)
  if (match) return match[1]
  return readingCount === 1 ? entry.sino_vn : []
}

/** One result card per distinct reading of the word (e.g. 中 zhōng / zhòng), in source order. */
export function splitByReading(entry: DictLiteResponse): ReadingResult[] {
  const readings = new Set<string>()
  for (const item of [...entry.cedict, ...(entry.cvdict ?? []), ...(entry.xdhy ?? [])]) {
    if (item.pinyin) readings.add(normalizePinyin(item.pinyin))
  }
  if (readings.size === 0) return [{ key: entry.char, entry }]

  return [...readings].flatMap((reading) => {
    const matches = (x: { pinyin?: string }) => !x.pinyin || normalizePinyin(x.pinyin) === reading
    const filtered: DictLiteResponse = {
      ...entry,
      sino_vn: sinoVnForReading(entry, reading, readings.size),
      cedict: entry.cedict.filter(matches),
      cvdict: entry.cvdict?.filter(matches) || [],
      xdhy: entry.xdhy?.filter(matches) || [],
    }
    const empty = filtered.cedict.length === 0 && filtered.cvdict.length === 0 && filtered.xdhy.length === 0
    return empty ? [] : [{ key: `${entry.char}-${reading}`, entry: filtered, pinyinFilter: reading }]
  })
}
