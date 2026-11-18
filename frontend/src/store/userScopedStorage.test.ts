import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setStorageUser, userScopedStorage as storage } from './userScopedStorage'

beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  })
  setStorageUser(null)
})

describe('userScopedStorage', () => {
  it('keeps each account separate', () => {
    setStorageUser(1)
    storage.setItem('widgets', 'mine')
    setStorageUser(2)
    expect(storage.getItem('widgets')).toBeNull()
    storage.setItem('widgets', 'theirs')
    setStorageUser(1)
    expect(storage.getItem('widgets')).toBe('mine')
  })

  it('reads and writes nothing while signed out', () => {
    storage.setItem('widgets', 'x')
    expect(localStorage.getItem('widgets')).toBeNull()
    expect(storage.getItem('widgets')).toBeNull()
  })

  it('hands the old shared value to the first account only', () => {
    localStorage.setItem('widgets', 'legacy')
    setStorageUser(1)
    expect(storage.getItem('widgets')).toBe('legacy')
    expect(localStorage.getItem('widgets')).toBeNull()
    setStorageUser(2)
    expect(storage.getItem('widgets')).toBeNull()
  })
})
