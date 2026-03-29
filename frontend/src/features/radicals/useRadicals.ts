import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/axios'
import type { RadicalDetail, RadicalSummary } from '@/types'

export function useRadicalList() {
  const [radicals, setRadicals] = useState<RadicalSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<RadicalSummary[]>('/radicals')
      .then((r) => setRadicals(r.data))
      .catch(() => setError('Failed to load radicals'))
      .finally(() => setLoading(false))
  }, [])

  return { radicals, loading, error }
}

export function useRadicalDetail() {
  const [detail, setDetail] = useState<RadicalDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetch = useCallback((radical: string) => {
    setLoading(true)
    setError('')
    setDetail(null)
    api.get<RadicalDetail>(`/radicals/${encodeURIComponent(radical)}`)
      .then((r) => setDetail(r.data))
      .catch(() => setError('Failed to load radical detail'))
      .finally(() => setLoading(false))
  }, [])

  return { detail, loading, error, fetch }
}
