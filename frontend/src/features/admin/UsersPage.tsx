import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { User } from '@/types'
import { ChangePasswordModal } from './components/ChangePasswordModal'
import { CreateUserForm } from './components/CreateUserForm'
import { UsersTable } from './components/UsersTable'
import { useAdminUsers } from './hooks/useAdminUsers'

export function UsersPage() {
  const { t } = useTranslation()
  const admin = useAdminUsers()
  const [showAdd, setShowAdd] = useState(false)
  const [passwordUser, setPasswordUser] = useState<User | null>(null)

  if (admin.loading && admin.users.length === 0) return <div>{t('common.loading')}</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">{t('admin.users.title')}</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-fg)] rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          {showAdd ? t('admin.users.cancel') : t('admin.users.add')}
        </button>
      </div>

      {showAdd && (
        <CreateUserForm onCreate={async (input) => {
          const ok = await admin.create(input)
          if (ok) setShowAdd(false)
          return ok
        }} />
      )}

      <UsersTable admin={admin} onChangePassword={setPasswordUser} />

      {passwordUser && (
        <ChangePasswordModal
          user={passwordUser}
          onUpdate={(updates) => admin.update(passwordUser.id, updates)}
          onClose={() => setPasswordUser(null)}
        />
      )}
    </div>
  )
}
