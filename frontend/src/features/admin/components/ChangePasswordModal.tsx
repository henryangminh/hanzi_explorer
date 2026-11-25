import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModalOverlay } from '@/components/ui/ModalOverlay'
import type { AdminUserUpdate, User } from '@/types'

const INPUT = 'w-full px-3 py-2 border rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]'

/** Admin sets a new password for a user (no current password needed). */
export function ChangePasswordModal({ user, onUpdate, onClose }: {
  user: User
  onUpdate: (updates: AdminUserUpdate) => Promise<boolean>
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmation) {
      alert(t('admin.users.passwordMismatch'))
      return
    }
    if (await onUpdate({ new_password: password })) {
      alert(t('admin.users.changePasswordSuccess'))
      onClose()
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl border border-[var(--color-border)] shadow-xl w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-1 text-[var(--color-text)]">
          {t('admin.users.changePasswordModalTitle', { account: user.username })}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('admin.users.newPassword')}</label>
            <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('admin.users.confirmNewPassword')}</label>
            <input required type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={INPUT} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-[var(--color-bg-subtle)] text-[var(--color-text)] rounded-lg text-sm font-medium hover:brightness-95">
              {t('admin.users.cancel')}
            </button>
            <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-fg)] rounded-lg text-sm font-medium hover:brightness-110">
              {t('admin.users.save')}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  )
}
