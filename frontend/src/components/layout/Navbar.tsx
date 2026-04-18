import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, NotebookText, StickyNote, Settings, LogOut, User, Sun, Moon, Shield, Menu, X, LayoutDashboard, GraduationCap } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useSettingsStore } from '@/store/settings.store'
import { cn } from '@/lib/cn'

const NAV_ITEMS = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/flashcards', labelKey: 'nav.flashcards', icon: GraduationCap },
  { to: '/dictionary', labelKey: 'nav.dictionary', icon: Search },
  { to: '/notebooks', labelKey: 'nav.notebooks', icon: NotebookText },
  { to: '/my-notes', labelKey: 'nav.myNotes', icon: StickyNote },
]

/** Small icon button with a tooltip label that appears below on hover */
function NavIconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={cn(
          'p-2 rounded-lg transition-colors',
          active
            ? 'text-[var(--color-primary)]'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)]'
        )}
      >
        {children}
      </button>
      {/* Tooltip */}
      <span className="
        pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1
        px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap
        bg-[var(--color-bg-surface)] border border-[var(--color-border)]
        text-[var(--color-text-muted)] shadow-sm
        opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50
      ">
        {label}
      </span>
    </div>
  )
}

/** Small icon link with a tooltip label that appears below on hover */
function NavIconLink({
  to,
  label,
  active,
  children,
}: {
  to: string
  label: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="relative group">
      <Link
        to={to}
        className={cn(
          'p-2 rounded-lg transition-colors block',
          active
            ? 'text-[var(--color-primary)]'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)]'
        )}
      >
        {children}
      </Link>
      {/* Tooltip */}
      <span className="
        pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1
        px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap
        bg-[var(--color-bg-surface)] border border-[var(--color-border)]
        text-[var(--color-text-muted)] shadow-sm
        opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50
      ">
        {label}
      </span>
    </div>
  )
}

export function Navbar() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useSettingsStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link
          to={user?.is_admin ? '/admin/dashboard' : '/dashboard'}
          className="flex items-center gap-2 shrink-0"
          onClick={closeMobileMenu}
        >
          <span className="font-cjk text-xl font-bold text-[var(--color-primary)]">漢</span>
          <span className="hidden sm:block text-sm font-semibold text-[var(--color-text)]">
            Hanzi Explorer
          </span>
        </Link>

        {/* Nav links — desktop only */}
        {!user?.is_admin && (
          <nav className="hidden sm:flex items-center gap-1">
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
                <span>{t(labelKey)}</span>
              </Link>
            ))}
          </nav>
        )}

        {/* Right actions — desktop only */}
        <div className="hidden sm:flex items-center gap-1">
          {/* Theme toggle */}
          <NavIconButton
            label={theme === 'light' ? t('nav.darkMode') : t('nav.lightMode')}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </NavIconButton>

          {/* Settings */}
          <NavIconLink
            to="/settings"
            label={t('nav.settings')}
            active={pathname.startsWith('/settings')}
          >
            <Settings size={16} />
          </NavIconLink>

          {/* Admin Link */}
          {user?.is_admin && (
            <NavIconLink
              to="/admin/users"
              label="Admin"
              active={pathname.startsWith('/admin')}
            >
              <Shield size={16} />
            </NavIconLink>
          )}

          {/* Profile */}
          <NavIconLink
            to="/profile"
            label={user?.display_name ?? t('nav.profile')}
            active={pathname === '/profile'}
          >
            <User size={16} />
          </NavIconLink>

          {/* Logout */}
          <NavIconButton label={t('nav.logout')} onClick={logout}>
            <LogOut size={16} />
          </NavIconButton>
        </div>

        {/* Hamburger button — mobile only */}
        <button
          className="sm:hidden p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)] transition-colors"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-3 flex flex-col gap-1">
          {/* Nav links */}
          {!user?.is_admin && NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={closeMobileMenu}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                pathname.startsWith(to)
                  ? 'bg-[var(--color-bg-subtle)] text-[var(--color-primary)] font-medium'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]'
              )}
            >
              <Icon size={16} />
              {t(labelKey)}
            </Link>
          ))}

          {/* Admin link */}
          {user?.is_admin && (
            <Link
              to="/admin/users"
              onClick={closeMobileMenu}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                pathname.startsWith('/admin')
                  ? 'bg-[var(--color-bg-subtle)] text-[var(--color-primary)] font-medium'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]'
              )}
            >
              <Shield size={16} />
              Admin
            </Link>
          )}

          <div className="my-1 border-t border-[var(--color-border)]" />

          {/* Profile */}
          <Link
            to="/profile"
            onClick={closeMobileMenu}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              pathname === '/profile'
                ? 'bg-[var(--color-bg-subtle)] text-[var(--color-primary)] font-medium'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]'
            )}
          >
            <User size={16} />
            {user?.display_name ?? t('nav.profile')}
          </Link>

          {/* Settings */}
          <Link
            to="/settings"
            onClick={closeMobileMenu}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              pathname.startsWith('/settings')
                ? 'bg-[var(--color-bg-subtle)] text-[var(--color-primary)] font-medium'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]'
            )}
          >
            <Settings size={16} />
            {t('nav.settings')}
          </Link>

          {/* Theme toggle */}
          <button
            onClick={() => { setTheme(theme === 'light' ? 'dark' : 'light'); closeMobileMenu() }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors text-left"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            {theme === 'light' ? t('nav.darkMode') : t('nav.lightMode')}
          </button>

          {/* Logout */}
          <button
            onClick={() => { logout(); closeMobileMenu() }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors text-left"
          >
            <LogOut size={16} />
            {t('nav.logout')}
          </button>
        </div>
      )}
    </header>
  )
}
