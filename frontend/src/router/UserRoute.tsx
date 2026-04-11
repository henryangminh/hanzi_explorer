import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

export function UserRoute({ children }: { children?: React.ReactNode }) {
  const { token, user } = useAuthStore()

  if (!token) return <Navigate to="/login" replace />
  // If user is admin, they are not allowed here, bounce to admin dashboard
  if (user && user.is_admin) return <Navigate to="/admin" replace />

  return children ? <>{children}</> : <Outlet />
}
