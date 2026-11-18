import { useTranslation } from 'react-i18next'
import { Check, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDateTime } from '@/lib/date'
import type { WordReport } from '@/types'

interface ReportCardProps {
  report: WordReport
  onResolve: () => void
  onReopen: () => void
  onDelete: () => void
}

/** One report: the word, what the user wrote, who and when, and the admin's actions. */
export function ReportCard({ report, onResolve, onReopen, onDelete }: ReportCardProps) {
  const { t } = useTranslation()
  return (
    <li className="flex gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      <span className="font-cjk text-2xl text-[var(--color-text)] shrink-0 select-text">{report.char}</span>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap break-words select-text">{report.message}</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {report.reporter} · {formatDateTime(report.created_at)}
          {report.resolved_at && ` · ${t('admin.reports.resolvedAt', { date: formatDateTime(report.resolved_at) })}`}
        </p>
      </div>
      <div className="flex items-start gap-1 shrink-0">
        {report.status === 'open' ? (
          <Button size="sm" variant="outline" onClick={onResolve}><Check size={14} />{t('admin.reports.resolve')}</Button>
        ) : (
          <Button size="sm" variant="outline" onClick={onReopen}><RotateCcw size={14} />{t('admin.reports.reopen')}</Button>
        )}
        <button
          onClick={onDelete}
          title={t('admin.reports.delete')}
          className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </li>
  )
}
