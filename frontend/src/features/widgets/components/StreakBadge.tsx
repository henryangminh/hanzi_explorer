import { useTranslation } from 'react-i18next'
import { Flame } from 'lucide-react'

/** Days in a row a streak must reach to show as "burning" (orange). */
const BURNING_FROM = 3

export function StreakBadge({ days, best }: { days: number; best: number }) {
  const { t } = useTranslation()
  const color = days >= BURNING_FROM ? 'text-orange-500' : 'text-gray-400'
  return (
    <span title={`${t('dashboard.streak', { count: days })} · ${t('dashboard.bestStreak', { count: best })}`} className={`flex items-center gap-0.5 text-xs font-semibold flex-shrink-0 ${color}`}>
      <Flame size={14} fill="currentColor" />
      {days}
    </span>
  )
}
