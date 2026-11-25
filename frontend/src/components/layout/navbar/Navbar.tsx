import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { DesktopNav } from './DesktopNav'
import { MobileMenu } from './MobileMenu'
import { UserActions } from './UserActions'

export function Navbar() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link to={user?.is_admin ? '/admin/dashboard' : '/dashboard'} className="flex items-center gap-2 shrink-0" onClick={closeMobileMenu}>
          {/* The logo as a mask, so it takes the theme's primary color (lighter in dark mode) */}
          <span aria-hidden className="h-6 w-[27px] bg-[var(--color-primary)] [mask:url(/logo.png)_center/contain_no-repeat]" />
          {/* Hidden where the full menu is shown but still tight (lg), so the English labels fit */}
          <span className="hidden sm:block lg:hidden xl:block text-sm font-semibold text-[var(--color-text)]">Hanzi Explorer</span>
        </Link>

        {!user?.is_admin && <DesktopNav pathname={pathname} />}
        <UserActions pathname={pathname} />

        <button
          className="lg:hidden p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)] transition-colors"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label={t('nav.toggleMenu')}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileMenuOpen && <MobileMenu pathname={pathname} onClose={closeMobileMenu} />}
    </header>
  )
}
