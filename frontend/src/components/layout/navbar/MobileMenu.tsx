import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogOut, Moon, Settings, Shield, Sun, User } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/store/auth.store'
import { useSettingsStore } from '@/store/settings.store'
import { NAV_ITEMS } from './navItems'

const ROW = 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors'
const IDLE = 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]'
const ACTIVE = 'bg-[var(--color-bg-subtle)] text-[var(--color-primary)] font-medium'

function MenuLink({ to, active, onClick, children }: { to: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link to={to} onClick={onClick} className={cn(ROW, active ? ACTIVE : IDLE)}>
      {children}
    </Link>
  )
}

function MenuButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn(ROW, IDLE, 'text-left')}>{children}</button>
}

/** Dropdown with every navigation item and action (mobile). Every choice closes it. */
export function MobileMenu({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const { t } = useTranslation()
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useSettingsStore()

  return (
    <div className="sm:hidden border-t border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-3 flex flex-col gap-1">
      {!user?.is_admin && NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
        <MenuLink key={to} to={to} active={pathname.startsWith(to)} onClick={onClose}>
          <Icon size={16} />
          {t(labelKey)}
        </MenuLink>
      ))}
      {user?.is_admin && (
        <MenuLink to="/admin/users" active={pathname.startsWith('/admin')} onClick={onClose}>
          <Shield size={16} />
          {t('nav.admin')}
        </MenuLink>
      )}

      <div className="my-1 border-t border-[var(--color-border)]" />

      <MenuLink to="/profile" active={pathname === '/profile'} onClick={onClose}>
        <User size={16} />
        {user?.display_name ?? t('nav.profile')}
      </MenuLink>
      <MenuLink to="/settings" active={pathname.startsWith('/settings')} onClick={onClose}>
        <Settings size={16} />
        {t('nav.settings')}
      </MenuLink>
      <MenuButton onClick={() => { setTheme(theme === 'light' ? 'dark' : 'light'); onClose() }}>
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        {theme === 'light' ? t('nav.darkMode') : t('nav.lightMode')}
      </MenuButton>
      <MenuButton onClick={() => { logout(); onClose() }}>
        <LogOut size={16} />
        {t('nav.logout')}
      </MenuButton>
    </div>
  )
}
