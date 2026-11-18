import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import type { WordReportStatus } from '@/types'
import { ReportCard } from './components/ReportCard'
import { useWordReports } from './hooks/useWordReports'

const TABS: [WordReportStatus, string][] = [
  ['open', 'admin.reports.tabOpen'],
  ['resolved', 'admin.reports.tabResolved'],
]

/** Dictionary errors reported by users, to fix and mark as resolved. */
export function ReportsPage() {
  const { t } = useTranslation()
  const reports = useWordReports()

  function confirmDelete(id: number) {
    if (confirm(t('admin.reports.confirmDelete'))) reports.remove(id)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">{t('admin.layout.reports')}</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">{t('admin.reports.subtitle')}</p>
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {TABS.map(([status, key]) => (
          <button
            key={status}
            onClick={() => reports.setStatus(status)}
            className={cn(
              'px-4 py-2 text-sm -mb-px border-b-2 transition-colors',
              reports.status === status
                ? 'border-[var(--color-primary)] text-[var(--color-text)] font-medium'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            )}
          >
            {t(key)}
          </button>
        ))}
      </div>

      {reports.loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t('common.loading')}</p>
      ) : reports.reports.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t('admin.reports.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {reports.reports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              onResolve={() => reports.resolve(r.id)}
              onReopen={() => reports.reopen(r.id)}
              onDelete={() => confirmDelete(r.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
