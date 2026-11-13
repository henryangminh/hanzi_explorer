import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import type { CvdictEntry } from '@/types'
import { DictionaryList } from '../DictionaryList'
import { CollapsibleSection } from './CollapsibleSection'
import { MeaningWithRefs } from './MeaningWithRefs'

/** CVDICT packs several meanings into one entry separated by "/": list them a) b) … or 1) 2) …. */
function CvdictMeanings({ entry, hasSiblings, onWordClick }: {
  entry: CvdictEntry
  hasSiblings: boolean
  onWordClick?: (word: string) => void
}) {
  const parts = entry.meaning_vi.split('/').filter(Boolean)
  const numbered = parts.length > 1
  return (
    <>
      {parts.map((meaning, i) => (
        <div key={i} className={cn('text-sm text-[var(--color-text-muted)]', numbered && 'flex gap-1.5')}>
          {numbered && (
            <span className="shrink-0 text-[var(--color-text-muted)]">
              {hasSiblings ? `${String.fromCharCode(97 + i)})` : `${i + 1})`}
            </span>
          )}
          <span><MeaningWithRefs text={meaning.trim()} onWordClick={onWordClick} /></span>
        </div>
      ))}
    </>
  )
}

export function CvdictSection({ entries, onWordClick }: { entries: CvdictEntry[]; onWordClick?: (word: string) => void }) {
  const { t } = useTranslation()
  if (!entries?.length) return null
  return (
    <CollapsibleSection title={t('dictionary.cvdict')}>
      <div className="pl-4">
        <DictionaryList
          entries={entries}
          renderMeaning={(cv, hasSiblings) => <CvdictMeanings entry={cv} hasSiblings={hasSiblings} onWordClick={onWordClick} />}
        />
      </div>
    </CollapsibleSection>
  )
}
