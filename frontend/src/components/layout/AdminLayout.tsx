import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { Users, Database, Shield, DatabaseBackup, LogOut, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Navbar } from './Navbar'
import { useTranslation } from 'react-i18next'

export function AdminLayout() {
  const { pathname } = useLocation()
  const { logout, user } = useAuthStore()
  const { t } = useTranslation()

  const ADMIN_LINKS = [
    { to: '/admin/dashboard', label: t('admin.layout.systemAdmin'), icon: LayoutDashboard },
    { to: '/admin/users', label: t('admin.layout.users'), icon: Users },
    { to: '/admin/data', label: t('admin.layout.data'), icon: Database },
    { to: '/admin/moderation', label: t('admin.layout.moderation'), icon: Shield },
    { to: '/admin/notebooks', label: t('admin.layout.notebooks'), icon: DatabaseBackup },
  ]

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)]">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-[var(--color-border)] bg-[var(--color-bg-surface)] flex flex-col shrink-0">
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4 px-2">
            {t('admin.layout.systemAdmin')}
          </div>
          {ADMIN_LINKS.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                title={label}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-medium'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]'
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-muted)] truncate max-w-[120px]">
              {user?.display_name}
            </span>
            <button
              onClick={logout}
              className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] rounded-lg transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-[var(--color-bg)]">
          <div className="p-8 max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
