import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { NAV_ITEMS } from './navItems'

/** Section links in the bar (desktop; below lg they don't fit, in English especially). */
export function DesktopNav({ pathname }: { pathname: string }) {
  const { t } = useTranslation()
  return (
    <nav className="hidden lg:flex items-center gap-1">
      {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
            pathname.startsWith(to)
              ? 'bg-[var(--color-bg-subtle)] text-[var(--color-primary)] font-medium'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]',
          )}
        >
          <Icon size={15} />
          <span>{t(labelKey)}</span>
        </Link>
      ))}
    </nav>
  )
}
