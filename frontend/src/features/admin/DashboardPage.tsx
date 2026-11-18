import { useAuthStore } from '@/store/auth.store'
import { useTranslation } from 'react-i18next'
import { LearnersTable } from './components/LearnersTable'
import { RecentSearches } from './components/RecentSearches'
import { StatTile } from './components/StatTile'
import { useAdminStats } from './hooks/useAdminStats'
import { studiedWithin } from './learnerStats'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{children}</h2>
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const { stats, error } = useAdminStats()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          {t('admin.dashboard.welcome', { name: user?.display_name || user?.username || t('nav.profile') })}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">{t('admin.dashboard.subtitle')}</p>
      </div>

      {error && <p className="text-sm text-red-500">{t('admin.dashboard.loadError')}</p>}
      {!stats && !error && <p className="text-sm text-[var(--color-text-muted)]">{t('common.loading')}</p>}

      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile
              label={t('admin.dashboard.activeUsers')}
              value={stats.active_users}
              hint={t('admin.dashboard.totalUsers', { count: stats.total_users })}
              to="/admin/users"
            />
            <StatTile
              label={t('admin.dashboard.learners7d')}
              value={stats.learners.filter((l) => studiedWithin(l.studied_dates, 7)).length}
              hint={t('admin.dashboard.learners30d', { count: stats.learners.filter((l) => studiedWithin(l.studied_dates, 30)).length })}
            />
            <StatTile
              label={t('admin.dashboard.globalNotebooks')}
              value={stats.global_notebooks}
              hint={t('admin.dashboard.globalEntries', { count: stats.global_entries.toLocaleString() })}
              to="/admin/notebooks"
            />
            <StatTile
              label={t('admin.dashboard.openReports')}
              value={stats.open_reports}
              hint={t('admin.dashboard.openReportsHint')}
              to="/admin/reports"
            />
          </div>

          <section className="flex flex-col gap-3">
            <SectionTitle>{t('admin.dashboard.learnersTitle')}</SectionTitle>
            <LearnersTable learners={stats.learners} />
          </section>

          <section className="flex flex-col gap-3">
            <SectionTitle>{t('admin.dashboard.recentSearches')}</SectionTitle>
            <RecentSearches searches={stats.recent_searches} />
          </section>
        </>
      )}
    </div>
  )
}
