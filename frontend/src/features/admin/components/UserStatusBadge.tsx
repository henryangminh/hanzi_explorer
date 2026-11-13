import { useTranslation } from 'react-i18next'
import type { User } from '@/types'

export function UserStatusBadge({ user }: { user: User }) {
  const { t } = useTranslation()
  const [color, labelKey] = user.is_deleted
    ? ['bg-red-600', 'admin.users.statusDeleted']
    : user.is_active ? ['bg-green-600', 'admin.users.statusActive'] : ['bg-yellow-600', 'admin.users.statusLocked']
  return <span className={`px-2 py-1 ${color} text-white rounded text-xs font-medium`}>{t(labelKey)}</span>
}
