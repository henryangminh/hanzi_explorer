import { useTranslation } from 'react-i18next'
import { LogOut, Moon, Settings, Shield, Sun, User } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useSettingsStore } from '@/store/settings.store'
import { NavIconButton, NavIconLink } from './NavIcon'

/** Theme, settings, admin, profile and logout icons (desktop). */
export function UserActions({ pathname }: { pathname: string }) {
  const { t } = useTranslation()
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useSettingsStore()
  return (
    <div className="hidden sm:flex items-center gap-1">
      <NavIconButton label={theme === 'light' ? t('nav.darkMode') : t('nav.lightMode')} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </NavIconButton>
      <NavIconLink to="/settings" label={t('nav.settings')} active={pathname.startsWith('/settings')}>
        <Settings size={16} />
      </NavIconLink>
      {user?.is_admin && (
        <NavIconLink to="/admin/users" label={t('nav.admin')} active={pathname.startsWith('/admin')}>
          <Shield size={16} />
        </NavIconLink>
      )}
      <NavIconLink to="/profile" label={user?.display_name ?? t('nav.profile')} active={pathname === '/profile'}>
        <User size={16} />
      </NavIconLink>
      <NavIconButton label={t('nav.logout')} onClick={logout}>
        <LogOut size={16} />
      </NavIconButton>
    </div>
  )
}
