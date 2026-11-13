import { useTranslation } from 'react-i18next'
import type { User } from '@/types'
import type { AdminUsers } from '../hooks/useAdminUsers'
import { UserRow } from './UserRow'

export function UsersTable({ admin, onChangePassword }: { admin: AdminUsers; onChangePassword: (user: User) => void }) {
  const { t } = useTranslation()
  const columns: [string, string][] = [
    ['admin.users.id', 'rounded-tl-xl'],
    ['admin.users.username', ''],
    ['admin.users.displayName', ''],
    ['admin.users.status', ''],
    ['admin.users.role', 'text-center'],
    ['admin.users.actions', 'text-right rounded-tr-xl'],
  ]

  function confirmDelete(id: number) {
    if (confirm(t('admin.users.confirmDelete'))) admin.remove(id)
  }

  return (
    <div className="bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-border)]">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
          <tr>
            {columns.map(([key, className]) => <th key={key} className={`px-4 py-3 font-medium ${className}`}>{t(key)}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {admin.users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              onUpdate={(updates) => admin.update(user.id, updates)}
              onDelete={() => confirmDelete(user.id)}
              onRestore={() => admin.restore(user.id)}
              onChangePassword={() => onChangePassword(user)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
