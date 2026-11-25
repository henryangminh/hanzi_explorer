import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { usersApi } from '@/api/usersApi'
import i18n from '@/i18n'

interface SettingsState {
  theme: 'light' | 'dark'
  language: 'vi' | 'en'
  setTheme: (theme: 'light' | 'dark') => void
  setLanguage: (lang: 'vi' | 'en') => void
  syncToServer: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      language: 'vi',

      setTheme: (theme) => {
        set({ theme })
        document.documentElement.classList.toggle('dark', theme === 'dark')
      },

      setLanguage: (language) => {
        set({ language })
        i18n.changeLanguage(language)
      },

      syncToServer: async () => {
        const { theme, language } = get()
        await usersApi.saveSettings({ theme, language })
      },
    }),
    {
      name: 'settings-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.toggle('dark', state.theme === 'dark')
          i18n.changeLanguage(state.language)
        }
      },
    }
  )
)
