import { useTranslation } from 'react-i18next'
import { groupByStrokeCount } from '@/lib/groupBy'
import { useUIStore } from '@/store/ui.store'
import type { RadicalSummary } from '@/types'
import { RadicalCard } from './components/RadicalCard'
import { RadicalPopup } from './components/RadicalPopup'
import { StrokeGroupHeading } from './components/StrokeGroupHeading'
import { TILE_GRID } from './components/tileStyles'
import { useRadicalList } from './hooks/useRadicalList'

export function RadicalsPage() {
  const { t } = useTranslation()
  const { radicals, loading } = useRadicalList()
  const { selectedRadical, setSelectedRadical, setSelectedRadicalChar } = useUIStore()

  function open(radical: RadicalSummary | null) {
    setSelectedRadical(radical)
    setSelectedRadicalChar(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{t('radicals.title')}</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">{t('radicals.subtitle')}</p>
      </div>

      {loading && <p className="text-sm text-[var(--color-text-muted)]">{t('common.loading')}</p>}

      <div className="flex flex-col gap-5">
        {groupByStrokeCount(radicals).map(([strokes, items]) => (
          <div key={strokes}>
            <StrokeGroupHeading>{t('radicals.strokeGroup', { strokes, count: items.length })}</StrokeGroupHeading>
            <div className={TILE_GRID}>
              {items.map((r) => <RadicalCard key={r.id} radical={r} onClick={() => open(r)} />)}
            </div>
          </div>
        ))}
      </div>

      {selectedRadical && <RadicalPopup radical={selectedRadical} onClose={() => open(null)} />}
    </div>
  )
}
