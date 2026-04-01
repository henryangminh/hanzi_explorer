import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, Search, NotebookText, Settings, LogOut, User, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useSettingsStore } from '@/store/settings.store'
import { cn } from '@/lib/cn'

const NAV_ITEMS = [
  { to: '/radicals', labelKey: 'nav.radicals', icon: BookOpen },
  { to: '/dictionary', labelKey: 'nav.dictionary', icon: Search },
  { to: '/notebooks', labelKey: 'nav.notebooks', icon: NotebookText },
]

export function Navbar() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useSettingsStore()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/radicals" className="flex items-center gap-2 shrink-0">
          <span className="font-cjk text-xl font-bold text-[var(--color-primary)]">漢</span>
          <span className="hidden sm:block text-sm font-semibold text-[var(--color-text)]">
            Hanzi Explorer
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                pathname.startsWith(to)
                  ? 'bg-[var(--color-bg-subtle)] text-[var(--color-primary)] font-medium'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]'
              )}
            >
              <Icon size={15} />
              <span className="hidden sm:block">{t(labelKey)}</span>
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Settings */}
          <Link
            to="/settings"
            className={cn(
              'p-2 rounded-lg transition-colors',
              pathname === '/settings'
                ? 'text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)]'
            )}
          >
            <Settings size={16} />
          </Link>

          {/* Profile */}
          <Link
            to="/profile"
            className={cn(
              'p-2 rounded-lg transition-colors',
              pathname === '/profile'
                ? 'text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)]'
            )}
            title={user?.display_name}
          >
            <User size={16} />
          </Link>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)] transition-colors"
            title={t('nav.logout')}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
