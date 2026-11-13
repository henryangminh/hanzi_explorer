import { getToken, handleUnauthorized } from './axios'

interface StreamOptions {
  signal?: AbortSignal
  /** Deliver parsed items at most every `flushMs` (fewer re-renders); default: after each network chunk. */
  flushMs?: number
}

/**
 * GET an NDJSON endpoint of the API and hand parsed items to `onItems` as they arrive.
 * Resolves when the stream ends; rejects on HTTP errors (401 also redirects to login).
 */
export async function streamNdjson<T>(
  path: string,
  onItems: (items: T[]) => void,
  { signal, flushMs }: StreamOptions = {},
): Promise<void> {
  const token = getToken()
  const response = await fetch(`/api/v1${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
  })
  if (response.status === 401) handleUnauthorized()
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)

  const pending: T[] = []
  const flush = () => {
    if (pending.length > 0 && !signal?.aborted) onItems(pending.splice(0))
  }
  const timer = flushMs ? setInterval(flush, flushMs) : undefined

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.trim()) pending.push(JSON.parse(line) as T)
      }
      if (!flushMs) flush()
    }
    if (buffer.trim()) pending.push(JSON.parse(buffer) as T)
    flush()
  } finally {
    clearInterval(timer)
  }
}
