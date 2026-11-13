import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { ProtectedRoute } from './ProtectedRoute'

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)

  return (
    <ProtectedRoute>
      {user && !user.is_admin ? <Navigate to="/" replace /> : children}
    </ProtectedRoute>
  )
}
