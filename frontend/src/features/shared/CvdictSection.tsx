import { cn } from '@/lib/cn'
import type { CvdictEntry } from '@/types'

interface CvdictSectionProps {
  entries: CvdictEntry[]
}

export function CvdictSection({ entries }: CvdictSectionProps) {
  if (!entries || entries.length === 0) return null

  return (
    <div>
      <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
        CVDICT — Hán Việt
      </p>

      <div className="flex flex-col gap-3">
        {entries.map((entry, idx) => (
          <div
            key={entry.id}
            className={cn(
              'flex flex-col gap-1 pl-3',
              entries.length > 1 && 'border-l-2 border-[var(--color-border-md)]'
            )}
          >
            <div className="flex items-center gap-2 flex-wrap">
              {entries.length > 1 && (
                <span className="text-xs font-medium text-[var(--color-primary)]">
                  #{idx + 1}
                </span>
              )}
              <span className="font-medium text-[var(--color-text)]">
                {entry.pinyin}
              </span>
              {entry.traditional && (
                <span className="text-xs text-[var(--color-text-muted)]">
                  繁: <span className="font-cjk">{entry.traditional}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col gap-0.5">
              {entry.meaning_vi.split('/').filter(Boolean).map((meaning, i) => {
                const parts = entry.meaning_vi.split('/').filter(Boolean)
                return (
                  <p key={i} className="text-sm text-[var(--color-text-muted)]">
                    {parts.length > 1 ? (
                      <><span className="text-xs text-[var(--color-primary)] mr-1">{i + 1}.</span>{meaning.trim()}</>
                    ) : meaning.trim()}
                  </p>
                )
              })}
            </div>

            {entry.hsk_level && (
              <span className="text-xs bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-full text-[var(--color-primary)] w-fit">
                HSK {entry.hsk_level}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
