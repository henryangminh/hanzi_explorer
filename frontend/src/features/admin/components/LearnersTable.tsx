import { useTranslation } from 'react-i18next'
import { formatDateShort } from '@/lib/date'
import type { UserActivity } from '@/types'
import { StreakBadge } from '@/features/widgets/components/StreakBadge'
import { countStreak, longestStreak } from '@/features/widgets/streak'

const NUMBER = 'px-4 py-3 text-right tabular-nums'

/** Each learner's streak, last study day and flashcard progress. */
export function LearnersTable({ learners }: { learners: UserActivity[] }) {
  const { t } = useTranslation()
  const columns: [string, string][] = [
    ['admin.dashboard.colUser', 'text-left'],
    ['admin.dashboard.colStreak', 'text-left'],
    ['admin.dashboard.colBest', 'text-right'],
    ['admin.dashboard.colLastStudied', 'text-left'],
    ['admin.dashboard.colLearned', 'text-right'],
    ['admin.dashboard.colNotLearned', 'text-right'],
    ['admin.dashboard.colReviewDue', 'text-right'],
  ]

  if (learners.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">{t('admin.dashboard.noLearners')}</p>
  }

  return (
    <div className="bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-border)] overflow-x-auto">
      <table className="w-full text-sm whitespace-nowrap">
        <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
          <tr>{columns.map(([key, align]) => <th key={key} className={`px-4 py-3 font-medium ${align}`}>{t(key)}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text)]">
          {learners.map((l) => {
            const dates = new Set(l.studied_dates)
            return (
              <tr key={l.id}>
                <td className="px-4 py-3">
                  <span className="font-medium">{l.display_name}</span>
                  <span className="text-[var(--color-text-muted)]"> · {l.username}</span>
                </td>
                <td className="px-4 py-3"><StreakBadge days={countStreak(dates)} best={longestStreak(dates)} /></td>
                <td className={NUMBER}>{longestStreak(dates)}</td>
                <td className="px-4 py-3">{l.studied_dates[0] ? formatDateShort(l.studied_dates[0]) : '—'}</td>
                <td className={NUMBER}>{l.learned_count}</td>
                <td className={NUMBER}>{l.not_learned_count}</td>
                <td className={NUMBER}>{l.review_due}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
