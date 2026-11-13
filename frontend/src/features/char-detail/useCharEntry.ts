import { useEffect, useState } from 'react'
import { dictionaryApi } from '@/api/dictionaryApi'
import type { DictionaryResponse, DictLiteResponse } from '@/types'
import { isFullEntry, type InitialEntry } from './entryView'

/**
 * A word's dictionary data in two phases: local-DB data first (from `initialEntry` or a fast
 * lookup), then the full entry with Wiktionary. Fetched once per mount — the panel is mounted per word.
 */
export function useCharEntry(char: string, initialEntry: InitialEntry | undefined, onFullLoaded: (full: DictionaryResponse) => void) {
  const [full, setFull] = useState<DictionaryResponse | null>(initialEntry && isFullEntry(initialEntry) ? initialEntry : null)
  const [lite, setLite] = useState<DictLiteResponse | null>(initialEntry && !isFullEntry(initialEntry) ? initialEntry : null)
  const [loadingFull, setLoadingFull] = useState(!full)

  useEffect(() => {
    if (full) return
    let cancelled = false
    const run = async () => {
      // Phase 1: show local data right away while Wiktionary loads
      if (!initialEntry) {
        const data = await dictionaryApi.lookup(char).catch(() => null)
        if (data && !cancelled) setLite(data)
      }
      // Phase 2: full entry (server-side cached)
      try {
        const data = await dictionaryApi.full(char)
        if (cancelled) return
        setFull(data)
        setLite(null)
        onFullLoaded(data)
      } catch {
        // keep the lite data visible
      } finally {
        if (!cancelled) setLoadingFull(false)
      }
    }
    run()
    return () => { cancelled = true }
    // Once per mount, see above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { full, lite, loadingFull }
}
