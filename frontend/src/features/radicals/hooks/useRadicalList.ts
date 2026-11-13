import { useEffect, useState } from 'react'
import { radicalsApi } from '@/api/radicalsApi'
import type { RadicalSummary } from '@/types'

/** The 214 Kangxi radicals. */
export function useRadicalList() {
  const [radicals, setRadicals] = useState<RadicalSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    radicalsApi.list()
      .then(setRadicals)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { radicals, loading }
}
