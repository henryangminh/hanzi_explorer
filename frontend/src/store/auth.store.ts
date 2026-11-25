import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { authApi } from '@/api/authApi'
import { resetSessionStores } from './resetSessionStores'
import { useSettingsStore } from './settings.store'

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
        resetSessionStores()
        try {
          const { access_token } = await authApi.login(username, password)
          localStorage.setItem('access_token', access_token)
          set({ token: access_token })
          const user = await authApi.me()
          // The account's saved theme and language follow it to every browser
          const settings = useSettingsStore.getState()
          settings.setTheme(user.theme)
          settings.setLanguage(user.language)
          set({ user, isLoading: false })
          return user
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: () => {
        localStorage.removeItem('access_token')
        resetSessionStores()
        set({ user: null, token: null })
      },

      fetchMe: async () => {
        try {
          set({ user: await authApi.me() })
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
