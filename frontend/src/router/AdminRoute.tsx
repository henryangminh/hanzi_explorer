import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token, user, fetchMe } = useAuthStore()
  const [loading, setLoading] = useState(!user)

  useEffect(() => {
    if (token && !user) {
      fetchMe().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token, user, fetchMe])

  if (!token) return <Navigate to="/login" replace />
  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-bg)]"><Loader2 className="animate-spin text-[var(--color-text-muted)]" /></div>
  
  if (user && !user.is_admin) return <Navigate to="/" replace />

  return <>{children}</>
}
