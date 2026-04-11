import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import api from '@/lib/axios'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<User>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (username, password) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/login', { username, password })
          localStorage.setItem('access_token', data.access_token)
          set({ token: data.access_token })
          const { data: user } = await api.get('/auth/me')
          set({ user, isLoading: false })
          return user
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: () => {
        localStorage.removeItem('access_token')
        set({ user: null, token: null })
      },

      fetchMe: async () => {
        try {
          const { data } = await api.get('/auth/me')
          set({ user: data })
        } catch {
          set({ user: null, token: null })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (s) => ({ token: s.token }),
    }
  )
)
