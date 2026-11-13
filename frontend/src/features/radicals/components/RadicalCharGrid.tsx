import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { groupByStrokeCount } from '@/lib/groupBy'
import type { RadicalChar } from '@/types'
import { StrokeGroupHeading } from './StrokeGroupHeading'
import { TILE, TILE_GRID } from './tileStyles'

const stopClick = (e: React.MouseEvent) => e.stopPropagation()

/** Characters containing the radical, grouped by stroke count. Text stays selectable. */
export function RadicalCharGrid({ chars, onSelect }: { chars: RadicalChar[]; onSelect: (char: string) => void }) {
  const { t } = useTranslation()
  return (
    <>
      <p className="text-xs text-[var(--color-text-muted)] mb-3">{t('radicals.charCount', { count: chars.length })}</p>
      {groupByStrokeCount(chars).map(([strokes, group]) => (
        <div key={strokes} className="mb-4">
          <StrokeGroupHeading>{t('radicals.strokeGroupChars', { strokes, count: group.length })}</StrokeGroupHeading>
          <div className={TILE_GRID}>
            {group.map((c) => (
              <div key={c.char} onClick={() => onSelect(c.char)} className={cn('flex flex-col items-center gap-1 py-3 px-2 rounded-xl', TILE)}>
                <span className="font-cjk text-3xl text-[var(--color-text)] leading-none select-text cursor-text" onClick={stopClick}>
                  {c.char}
                </span>
                {c.pinyin && (
                  <span className="text-xs text-[var(--color-text-muted)] leading-tight text-center select-text cursor-text" onClick={stopClick}>
                    {c.pinyin}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
