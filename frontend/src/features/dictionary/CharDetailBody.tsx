/**
 * Shared character detail body — used by DictionaryPage, RadicalsPage, NotebooksPage.
 * Renders all content sections (CC-CEDICT, CVDICT, Hanzipy, External, Notes).
 * Pass showNotes=false to hide the "Ghi chú của tôi" section.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CvdictSection } from './CvdictSection'
import api from '@/lib/axios'
import type { DictionaryResponse, UserNoteResponse } from '@/types'

interface Props {
  entry: DictionaryResponse
  showNotes?: boolean
  onNoteSaved?: (note: UserNoteResponse) => void
}

export function CharDetailBody({ entry, showNotes = true, onNoteSaved }: Props) {
  const { t } = useTranslation()
  const [noteMeaningVi, setNoteMeaningVi] = useState(entry.user_note?.meaning_vi ?? '')
  const [noteText, setNoteText] = useState(entry.user_note?.note ?? '')
  const [noteTags, setNoteTags] = useState(entry.user_note?.tags.join(', ') ?? '')
  const [savingNote, setSavingNote] = useState(false)

  const handleSaveNote = async () => {
    setSavingNote(true)
    try {
      const { data } = await api.put<UserNoteResponse>(
        `/dictionary/${encodeURIComponent(entry.char)}/note`,
        {
          meaning_vi: noteMeaningVi || null,
          note: noteText || null,
          tags: noteTags ? noteTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        }
      )
      onNoteSaved?.(data)
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* HSK tags */}
      {entry.hsk_tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.hsk_tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-[var(--color-primary)] font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* CC-CEDICT */}
      {entry.cedict.length > 0 && (
        <div>
          <CardTitle className="mb-2">{t('dictionary.cedict')}</CardTitle>
          <div className="flex flex-col gap-3">
            {entry.cedict.map((ce, idx) => (
              <div key={ce.id} className={cn(
                'flex flex-col gap-1 pl-3',
                entry.cedict.length > 1 && 'border-l-2 border-[var(--color-border-md)]'
              )}>
                <div className="flex items-center gap-2 flex-wrap">
                  {entry.cedict.length > 1 && (
                    <span className="text-xs font-medium text-[var(--color-primary)]">#{idx + 1}</span>
                  )}
                  <span className="font-medium text-[var(--color-text)]">{ce.pinyin}</span>
                  {ce.traditional && (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      繁: <span className="font-cjk">{ce.traditional}</span>
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">{ce.meaning_en}</p>
                <div className="flex flex-wrap gap-2 mt-0.5">
                  {ce.radical && (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {t('dictionary.radical')}: <span className="font-cjk">{ce.radical}</span>
                    </span>
                  )}
                  {ce.stroke_count && (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {t('dictionary.strokes')}: {ce.stroke_count}
                    </span>
                  )}
                  {ce.hsk_level && (
                    <span className="text-xs bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-full text-[var(--color-primary)]">
                      HSK {ce.hsk_level}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!entry.cedict.length && (
        <p className="text-sm text-[var(--color-text-muted)] italic">{t('dictionary.noResult')}</p>
      )}

      {/* CVDICT */}
      {entry.cvdict?.length > 0 && <CvdictSection entries={entry.cvdict} />}

      {/* External sources */}
      {entry.external?.map((src) => {
        const d = src.data as {
          found?: boolean
          sections?: { part_of_speech: string; definitions: string[] }[]
        }
        if (!d.found) return null
        return (
          <div key={src.source}>
            <div className="flex items-center justify-between mb-2">
              <CardTitle>{src.label}</CardTitle>
              {src.from_cache && (
                <span className="text-xs text-[var(--color-text-muted)]">{t('dictionary.fromCache')}</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {d.sections?.map((sec, i) => (
                <div key={i}>
                  {sec.part_of_speech && (
                    <span className="text-xs font-medium text-[var(--color-primary)] uppercase tracking-wide">
                      {sec.part_of_speech}
                    </span>
                  )}
                  <ol className="mt-1 flex flex-col gap-1 list-decimal list-inside">
                    {sec.definitions.map((def, j) => {
                      const isExample = def.startsWith('→')
                      return isExample ? (
                        <li key={j} className="list-none ml-4 text-sm italic" style={{ color: 'var(--color-accent)' }}>
                          {def}
                        </li>
                      ) : (
                        <li key={j} className="text-sm text-[var(--color-text)]">{def}</li>
                      )
                    })}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Notes */}
      {showNotes && (
        <div>
          <CardTitle className="mb-2">{t('dictionary.notes')}</CardTitle>
          <div className="flex flex-col gap-2">
            <Input
              id={`vi-${entry.char}`}
              label={t('dictionary.meaningVi')}
              value={noteMeaningVi}
              onChange={(e) => setNoteMeaningVi(e.target.value)}
              placeholder="vd: có thể, được phép..."
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-text)]">
                {t('dictionary.notes')}
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={t('dictionary.notePlaceholder')}
                rows={2}
                className={cn(
                  'w-full px-3 py-2 rounded-lg text-sm resize-none',
                  'bg-[var(--color-bg-surface)] text-[var(--color-text)]',
                  'border border-[var(--color-border)] focus:border-[var(--color-primary)]',
                  'outline-none transition-colors placeholder:text-[var(--color-text-muted)]'
                )}
              />
            </div>
            <Input
              id={`tags-${entry.char}`}
              label={t('dictionary.tags')}
              value={noteTags}
              onChange={(e) => setNoteTags(e.target.value)}
              placeholder="vd: tuần này, ngữ pháp"
            />
            <Button size="sm" onClick={handleSaveNote} isLoading={savingNote} className="self-end">
              {savingNote ? t('dictionary.saving') : t('dictionary.save')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
