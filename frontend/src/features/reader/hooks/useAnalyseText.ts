import { useState } from 'react'
import { readerApi } from '@/api/readerApi'
import { useReaderStore } from '@/store/reader.store'

/** Send the text to be split into words; `error` is set when that fails. */
export function useAnalyseText() {
  const setTokens = useReaderStore((s) => s.setTokens)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function analyse(text: string) {
    if (!text.trim()) return
    setLoading(true)
    setError(false)
    try {
      setTokens(await readerApi.segment(text))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return { analyse, loading, error }
}
