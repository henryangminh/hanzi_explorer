import { useTranslation } from 'react-i18next'
import type { CedictEntry } from '@/types'
import { DictionaryList } from '../DictionaryList'
import { CollapsibleSection } from './CollapsibleSection'
import { MeaningWithRefs } from './MeaningWithRefs'

export function CedictSection({ entries, onWordClick }: { entries: CedictEntry[]; onWordClick?: (word: string) => void }) {
  const { t } = useTranslation()
  if (entries.length === 0) return null
  return (
    <CollapsibleSection title={t('dictionary.cedict')}>
      <div className="pl-4">
        <DictionaryList
          entries={entries}
          renderMeaning={(ce) => (
            <p className="text-sm text-[var(--color-text-muted)]">
              <MeaningWithRefs text={ce.meaning_en} onWordClick={onWordClick} />
            </p>
          )}
        />
      </div>
    </CollapsibleSection>
  )
}
