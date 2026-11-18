import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheck, CirclePause, TriangleAlert } from 'lucide-react'
import { formatDateShort, formatDateTime, toLocalDateStr } from '@/lib/date'
import type { CrawlStatus } from '@/types'
import { ProgressMeter } from './ProgressMeter'

/** No request for this long means the crawler is not running (it makes one every ~45 s). */
const IDLE_AFTER_MS = 10 * 60 * 1000

function finishDate(etaDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + Math.ceil(etaDays))
  return formatDateShort(toLocalDateStr(d))
}

/** Progress and health of the hvdic crawl. */
export function CrawlStatusCard({ status }: { status: CrawlStatus }) {
  const { t } = useTranslation()
  const [loadedAt] = useState(() => Date.now())
  const lastRequest = status.last_request_at ? new Date(status.last_request_at).getTime() : 0
  const running = loadedAt - lastRequest < IDLE_AFTER_MS
  const blocked = status.denials_24h > 0

  const [Icon, color, stateKey] = blocked
    ? [TriangleAlert, 'text-red-500', 'admin.data.crawlBlocked']
    : running ? [CircleCheck, 'text-green-600', 'admin.data.crawlRunning'] : [CirclePause, 'text-[var(--color-text-muted)]', 'admin.data.crawlStopped']

  const facts: [string, string][] = [
    [t('admin.data.requests24h'), `${status.requests_24h.toLocaleString()} / ${status.budget_24h.toLocaleString()}`],
    [t('admin.data.denials'), t('admin.data.denialsValue', { day: status.denials_24h, week: status.denials_7d })],
    [t('admin.data.lastRequest'), status.last_request_at ? formatDateTime(status.last_request_at) : '—'],
    [t('admin.data.eta'), t('admin.data.etaValue', { days: Math.ceil(status.eta_days), date: finishDate(status.eta_days) })],
  ]

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      <div className={`flex items-center gap-1.5 text-sm font-medium ${color}`}>
        <Icon size={16} />
        {t(stateKey)}
      </div>
      <ProgressMeter label={t('admin.data.crawlChars')} done={status.chars_done} total={status.chars_total} />
      <ProgressMeter label={t('admin.data.crawlWords')} done={status.words_done} total={status.words_total} />
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {facts.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-xs text-[var(--color-text-muted)]">{label}</dt>
            <dd className="text-sm text-[var(--color-text)]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
