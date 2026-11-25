import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Edit, KeyRound, RotateCcw, Shield, ShieldOff, Trash2, X } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import type { AdminUserUpdate, User } from '@/types'
import { UserStatusBadge } from './UserStatusBadge'

interface UserRowProps {
  user: User
  onUpdate: (updates: AdminUserUpdate) => Promise<boolean>
  onDelete: () => void
  onRestore: () => void
  onChangePassword: () => void
}

/** One user; display name and admin role can be edited inline. */
export function UserRow({ user, onUpdate, onDelete, onRestore, onChangePassword }: UserRowProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<Pick<User, 'display_name' | 'is_admin'> | null>(null)

  async function save() {
    if (draft && await onUpdate({ display_name: draft.display_name, is_admin: draft.is_admin, is_active: user.is_active })) {
      setDraft(null)
    }
  }

  const action = (tooltip: string, onClick: () => void, icon: React.ReactNode, className = 'hover:text-[var(--color-text)]') => (
    <Tooltip position="top" text={tooltip}>
      <button onClick={onClick} aria-label={tooltip} className={`${className} outline-none`}>{icon}</button>
    </Tooltip>
  )

  return (
    <tr className={'hover:bg-[var(--color-bg-subtle)] ' + (user.is_deleted ? 'opacity-60' : '')}>
      <td className="px-4 py-3">{user.id}</td>
      <td className="px-4 py-3 font-medium">{user.username}</td>
      <td className="px-4 py-3">
        {draft ? (
          <input
            className="px-2 py-1 border rounded bg-[var(--color-bg)]"
            value={draft.display_name}
            onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
          />
        ) : user.display_name}
      </td>
      <td className="px-4 py-3"><UserStatusBadge user={user} /></td>
      <td className="px-4 py-3 text-center">
        {draft ? (
          <input type="checkbox" checked={draft.is_admin} onChange={(e) => setDraft({ ...draft, is_admin: e.target.checked })} />
        ) : user.is_admin ? (
          <Tooltip position="top" text={t('admin.users.tooltipRoleAdmin')}><Shield size={16} className="text-purple-600 inline-block outline-none" /></Tooltip>
        ) : (
          <Tooltip position="top" text={t('admin.users.tooltipRoleNotAdmin')}><ShieldOff size={16} className="text-[var(--color-text-muted)] inline-block opacity-50 outline-none" /></Tooltip>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {draft ? (
          <div className="flex justify-end gap-2 text-[var(--color-text-muted)]">
            {action(t('admin.users.tooltipSave'), save, <Check size={18} />, 'text-green-600 hover:text-green-700')}
            {action(t('admin.users.tooltipCancel'), () => setDraft(null), <X size={18} />, 'text-red-500 hover:text-red-600')}
          </div>
        ) : (
          <div className="flex justify-end gap-4 text-[var(--color-text-muted)] mt-1">
            {action(t('admin.users.tooltipChangePassword'), onChangePassword, <KeyRound size={16} />)}
            {action(t('admin.users.tooltipEdit'), () => setDraft({ display_name: user.display_name, is_admin: user.is_admin }), <Edit size={16} />)}
            {user.is_deleted
              ? action(t('admin.users.tooltipRestore'), onRestore, <RotateCcw size={16} />, 'text-green-600 hover:text-green-700')
              : action(t('admin.users.tooltipDelete'), onDelete, <Trash2 size={16} />, 'text-red-500 hover:text-red-600')}
          </div>
        )}
      </td>
    </tr>
  )
}
