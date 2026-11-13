import api from '@/lib/axios'

export const usersApi = {
  updateProfile: async (displayName: string): Promise<void> => {
    await api.patch('/users/profile', { display_name: displayName })
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.patch('/users/profile', { current_password: currentPassword, new_password: newPassword })
  },

  saveSettings: async (settings: { theme: 'light' | 'dark'; language: 'vi' | 'en' }): Promise<void> => {
    await api.patch('/settings', settings)
  },
}
