import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { adminApi, type AdminUserCreate } from '@/api/adminApi'
import { getErrorDetail } from '@/lib/axios'
import type { AdminUserUpdate, User } from '@/types'

/** All users, and admin actions that reload the list. Failures are reported with an alert. */
export function useAdminUsers() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  async function reload() {
    try {
      setUsers(await adminApi.listUsers())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  /** Run an action, reload, and return whether it succeeded. */
  async function run(action: () => Promise<void>, errorKey: string): Promise<boolean> {
    try {
      await action()
      await reload()
      return true
    } catch (e) {
      alert(getErrorDetail(e) || t(errorKey))
      return false
    }
  }

  return {
    users,
    loading,
    create: (input: AdminUserCreate) => run(() => adminApi.createUser(input), 'admin.users.errorCreate'),
    update: (id: number, updates: AdminUserUpdate) => run(() => adminApi.updateUser(id, updates), 'admin.users.errorUpdate'),
    remove: (id: number) => run(() => adminApi.deleteUser(id), 'admin.users.errorDelete'),
    restore: (id: number) => run(() => adminApi.restoreUser(id), 'admin.users.errorRestore'),
  }
}

export type AdminUsers = ReturnType<typeof useAdminUsers>
