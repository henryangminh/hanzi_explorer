import type { StateStorage } from 'zustand/middleware'

let userId: number | null = null

/**
 * localStorage kept per account (`<name>:<user id>`), so accounts sharing a browser don't see
 * each other's data; nothing is read or written while no one is signed in.
 */
export const userScopedStorage: StateStorage = {
  getItem: (name) => {
    if (userId === null) return null
    const key = `${name}:${userId}`
    const own = localStorage.getItem(key)
    if (own !== null) return own
    // Saved before storage was per account: the first account to sign in keeps it
    const legacy = localStorage.getItem(name)
    if (legacy !== null) {
      localStorage.setItem(key, legacy)
      localStorage.removeItem(name)
    }
    return legacy
  },
  setItem: (name, value) => {
    if (userId !== null) localStorage.setItem(`${name}:${userId}`, value)
  },
  removeItem: (name) => {
    if (userId !== null) localStorage.removeItem(`${name}:${userId}`)
  },
}

export function setStorageUser(id: number | null): void {
  userId = id
}
