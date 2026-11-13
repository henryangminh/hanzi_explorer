import api from '@/lib/axios'
import type { AdminUserUpdate, User } from '@/types'

export interface AdminUserCreate {
  username: string
  display_name: string
  password: string
  is_admin: boolean
  is_active: boolean
}

export const adminApi = {
  listUsers: async (): Promise<User[]> => {
    const { data } = await api.get<User[]>('/admin/users')
    return data
  },

  createUser: async (input: AdminUserCreate): Promise<void> => {
    await api.post('/admin/users', input)
  },

  updateUser: async (id: number, updates: AdminUserUpdate): Promise<void> => {
    await api.patch(`/admin/users/${id}`, updates)
  },

  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/admin/users/${id}`)
  },

  restoreUser: async (id: number): Promise<void> => {
    await api.post(`/admin/users/${id}/restore`)
  },
}
