import { useTranslation } from 'react-i18next'
import { formatDateTime } from '@/lib/date'
import type { RecentSearch } from '@/types'

/** The latest words looked up, by whom and when. */
export function RecentSearches({ searches }: { searches: RecentSearch[] }) {
  const { t } = useTranslation()
  if (searches.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">{t('admin.dashboard.noSearches')}</p>
  }
  return (
    <ul className="bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
      {searches.map((s, i) => (
        <li key={i} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm">
          <span className="font-cjk text-lg text-[var(--color-text)] truncate">{s.char}</span>
          <span className="text-xs text-[var(--color-text-muted)] shrink-0">{s.display_name} · {formatDateTime(s.searched_at)}</span>
        </li>
      ))}
    </ul>
  )
}
