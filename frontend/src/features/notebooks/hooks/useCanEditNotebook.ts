import { useAuthStore } from '@/store/auth.store'
import type { NotebookResponse } from '@/types'

/** Global notebooks are editable by admins only; private ones by their owner. */
export function useCanEditNotebook() {
  const user = useAuthStore((s) => s.user)
  return (nb: NotebookResponse) => nb.type === 'global' ? (user?.is_admin ?? false) : nb.owner_id === user?.id
}
