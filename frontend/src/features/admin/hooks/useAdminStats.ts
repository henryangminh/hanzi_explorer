import { useEffect, useState } from 'react'
import { adminApi } from '@/api/adminApi'
import { toLocalDateStr } from '@/lib/date'
import type { AdminStats } from '@/types'

/** The admin dashboard overview, loaded once. */
export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    adminApi.stats(toLocalDateStr()).then(setStats).catch(() => setError(true))
  }, [])

  return { stats, error }
}
