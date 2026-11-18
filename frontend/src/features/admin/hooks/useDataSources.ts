import { useEffect, useState } from 'react'
import { adminApi } from '@/api/adminApi'
import type { DataSources } from '@/types'

/** The data sources overview, loaded once. */
export function useDataSources() {
  const [data, setData] = useState<DataSources | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    adminApi.dataSources().then(setData).catch(() => setError(true))
  }, [])

  return { data, error }
}
