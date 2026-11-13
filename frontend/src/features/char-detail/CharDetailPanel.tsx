/**
 * Everything about one word: local dictionaries right away, Wiktionary when it arrives, and
 * optionally the user's notes. Used by the dictionary, notebooks and radicals pages.
 */
import { useTranslation } from 'react-i18next'
import type { DictionaryResponse } from '@/types'
import { CedictSection } from './components/CedictSection'
import { CharHeading } from './components/CharHeading'
import { CvdictSection } from './components/CvdictSection'
import { LoadingLine } from '@/components/ui/LoadingLine'
import { RadicalInfo } from './components/RadicalInfo'
import { TagList } from './components/TagList'
import { WiktionarySection } from './components/WiktionarySection'
import { WordListSection } from './components/WordListSection'
import { XdhySection } from './components/XdhySection'
import { filterByPinyin, hasAnyData, headwordInfo, isFullEntry, liteAsFull, type InitialEntry } from './entryView'
import { NotesSection } from './notes/NotesSection'
import { useCharNotes } from './notes/useCharNotes'
import { useCharEntry } from './useCharEntry'

interface Props {
  char: string
  /** Data the caller already has (lite or full); otherwise it is fetched. */
  initialEntry?: InitialEntry
  /** Show the "My notes" section. */
  showNotes?: boolean
  /** Only show the parts for this (normalized) reading. */
  pinyinFilter?: string
  onDataLoaded?: (entry: DictionaryResponse) => void
  onNoteSaved?: () => void
  onWordClick?: (word: string) => void
}

export function CharDetailPanel({ char, initialEntry, showNotes = false, pinyinFilter, onDataLoaded, onNoteSaved, onWordClick }: Props) {
  const { t } = useTranslation()
  const notes = useCharNotes(char, initialEntry && isFullEntry(initialEntry) ? initialEntry.user_notes ?? [] : [], onNoteSaved)
  const { full, lite, loadingFull } = useCharEntry(char, initialEntry, (data) => {
    notes.replaceAll(data.user_notes ?? [])
    onDataLoaded?.(data)
  })

  const loaded = full ?? (lite ? liteAsFull(lite) : null)
  if (!loaded) return <LoadingLine text={t('common.loading')} iconSize={14} className="py-6" />

  const entry = pinyinFilter ? filterByPinyin(loaded, pinyinFilter) : loaded
  const heading = headwordInfo(entry)
  const firstBilingual = entry.cedict[0] ?? entry.cvdict?.[0]

  return (
    <div className="flex flex-col gap-4">
      <CharHeading char={entry.char} traditional={heading.traditional} pinyin={heading.pinyin} />
      <TagList tags={entry.hsk_tags ?? []} />
      {firstBilingual && <RadicalInfo radical={firstBilingual.radical} strokeCount={firstBilingual.stroke_count} />}

      <CedictSection entries={entry.cedict} onWordClick={onWordClick} />
      <CvdictSection entries={entry.cvdict} onWordClick={onWordClick} />
      <XdhySection char={entry.char} entries={entry.xdhy} />
      <WordListSection title={t('dictionary.synonyms')} words={entry.synonyms} onWordClick={onWordClick} />
      <WordListSection title={t('dictionary.antonyms')} words={entry.antonyms} onWordClick={onWordClick} />

      {loadingFull
        ? <LoadingLine text={t('dictionary.loadingMore')} className="py-1" />
        : full?.external?.map((src) => <WiktionarySection key={src.source} source={src} />)}

      {!loadingFull && !hasAnyData(entry, full) && (
        <p className="text-sm text-[var(--color-text-muted)] italic">{t('dictionary.noResult')}</p>
      )}

      {showNotes && <NotesSection char={char} notes={notes} />}
    </div>
  )
}
