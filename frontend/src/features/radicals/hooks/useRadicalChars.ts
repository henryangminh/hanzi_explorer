import { useEffect, useState } from 'react'
import { radicalsApi } from '@/api/radicalsApi'
import type { RadicalChar } from '@/types'

/** Characters containing a radical. Data is tagged with its radical, so switching shows loading at once. */
export function useRadicalChars(radical: string) {
  const [loaded, setLoaded] = useState<{ radical: string; chars: RadicalChar[] } | null>(null)

  useEffect(() => {
    radicalsApi.chars(radical)
      .then((chars) => setLoaded({ radical, chars }))
      .catch(() => setLoaded({ radical, chars: [] }))
  }, [radical])

  const loading = loaded?.radical !== radical
  return { loading, chars: loading ? [] : loaded.chars }
}
