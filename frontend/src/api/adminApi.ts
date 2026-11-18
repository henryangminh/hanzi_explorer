import api from '@/lib/axios'
import type { AdminStats, AdminUserUpdate, DataSources, User } from '@/types'

export interface AdminUserCreate {
  username: string
  display_name: string
  password: string
  is_admin: boolean
  is_active: boolean
}

export const adminApi = {
  /** Dashboard overview; `date` is the admin's local date (for reviews due). */
  stats: async (date: string): Promise<AdminStats> => {
    const { data } = await api.get<AdminStats>('/admin/stats', { params: { date } })
    return data
  },

  /** Dictionary sources, online sources and the hvdic crawl progress (read only). */
  dataSources: async (): Promise<DataSources> => {
    const { data } = await api.get<DataSources>('/admin/data-sources')
    return data
  },

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
