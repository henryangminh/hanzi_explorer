import { useAuthStore } from '@/store/auth.store'
import { useTranslation } from 'react-i18next'

export function DashboardPage() {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
      <div className="w-16 h-16 bg-[var(--color-primary)] text-[var(--color-primary-fg)] rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg">
        漢
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)]">
        {t('admin.dashboard.welcome', { name: user?.display_name || user?.username || t('nav.profile') })}
      </h1>
      <p className="text-[var(--color-text-muted)] max-w-md mx-auto">
        {t('admin.dashboard.subtitle')}
      </p>
    </div>
  )
}
