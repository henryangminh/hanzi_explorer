import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, ChevronDown, ChevronUp, BookmarkPlus } from 'lucide-react'
import api from '@/lib/axios'
import type { DictionaryResponse, UserNoteResponse } from '@/types'
import { CvdictSection } from './CvdictSection'
import { CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import { SaveToNotebookModal } from '@/features/notebooks/SaveToNotebookModal'

// ── Single entry card ─────────────────────────────────────

function EntryCard({
  entry,
  isMultiChar,
  onNoteSaved,
}: {
  entry: DictionaryResponse
  isMultiChar: boolean
  onNoteSaved: (note: UserNoteResponse) => void
}) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [noteMeaningVi, setNoteMeaningVi] = useState(entry.user_note?.meaning_vi ?? '')
  const [noteText, setNoteText] = useState(entry.user_note?.note ?? '')
  const [noteTags, setNoteTags] = useState(entry.user_note?.tags.join(', ') ?? '')
  const [savingNote, setSavingNote] = useState(false)

  // Use first CEDICT entry for header preview
  const firstCedict = entry.cedict[0] ?? null

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
      onNoteSaved(data)
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <div className={cn(
      'border border-[var(--color-border)] rounded-xl overflow-hidden',
      isMultiChar && 'border-[var(--color-accent)]'
    )}>
      {saveModalOpen && (
        <SaveToNotebookModal char={entry.char} onClose={() => setSaveModalOpen(false)} />
      )}
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-subtle)] transition-colors text-left"
      >
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span className={cn(
            'font-cjk leading-none',
            isMultiChar ? 'text-3xl text-[var(--color-primary)]' : 'text-2xl text-[var(--color-text)]'
          )}>
            {entry.char}
          </span>
          {firstCedict?.traditional && firstCedict.traditional !== entry.char && (
            <span className={cn(
              'font-cjk leading-none text-[var(--color-text-muted)]',
              isMultiChar ? 'text-3xl' : 'text-2xl'
            )}>
              ({firstCedict.traditional})
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {firstCedict ? (
            <>
              <span className="text-sm font-medium text-[var(--color-text)]">
                {firstCedict.pinyin}
                {entry.cedict.length > 1 && (
                  <span className="ml-1.5 text-xs text-[var(--color-text-muted)]">
                    +{entry.cedict.length - 1} cách đọc
                  </span>
                )}
              </span>
              <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                {firstCedict.meaning_en}
              </p>
            </>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)] italic">
              {t('dictionary.noResult')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isMultiChar && (
            <span className="text-xs bg-[var(--color-bg-subtle)] border border-[var(--color-border-md)] px-2 py-0.5 rounded-full text-[var(--color-primary)]">
              từ ghép
            </span>
          )}
          {firstCedict?.hsk_level && (
            <span className="text-xs bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-full text-[var(--color-text-muted)]">
              HSK {firstCedict.hsk_level}
            </span>
          )}
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); setSaveModalOpen(true) }}
            className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            title={t('notebooks.saveToNotebook')}
          >
            <BookmarkPlus size={14} />
          </span>
          {collapsed
            ? <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
            : <ChevronUp size={14} className="text-[var(--color-text-muted)]" />
          }
        </div>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="px-4 pb-4 pt-2 bg-[var(--color-bg-surface)] border-t border-[var(--color-border)] flex flex-col gap-4">

          {/* HSK level tags */}
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

          {/* CC-CEDICT — all readings */}
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
                        <span className="text-xs font-medium text-[var(--color-primary)]">
                          #{idx + 1}
                        </span>
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

          {/* CVDICT — Hán Việt */}
          {entry.cvdict && entry.cvdict.length > 0 && (
            <CvdictSection entries={entry.cvdict} />
          )}

          {/* External sources */}
          {entry.external.map((src) => {
            const d = src.data as {
              found?: boolean
              error?: string
              sections?: { part_of_speech: string; definitions: string[] }[]
            }
            // Hide section entirely if not found
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
                              <li key={j} className="list-none ml-4 text-sm italic" style={{color:'var(--color-accent)'}}>
                                {def}
                              </li>
                            ) : (
                              <li key={j} className="text-sm text-[var(--color-text)]">
                                {def}
                              </li>
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

        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────

export function DictionaryPage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DictionaryResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError('')
    setResults([])
    try {
      const { data } = await api.get<DictionaryResponse[]>('/dictionary/search', { params: { q } })
      setResults(data)
    } catch {
      setError(t('dictionary.noResult'))
    } finally {
      setLoading(false)
    }
  }

  const handleNoteSaved = (char: string, note: UserNoteResponse) => {
    setResults((prev) => prev.map((r) => (r.char === char ? { ...r, user_note: note } : r)))
  }

  const multiCharResults = results.filter((r) => r.char.length > 1)
  const coveredChars = new Set(multiCharResults.flatMap((r) => r.char.split('')))
  const freeSingles    = results.filter((r) => r.char.length === 1 && !coveredChars.has(r.char))
  const coveredSingles = results.filter((r) => r.char.length === 1 && coveredChars.has(r.char))

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <h1 className="text-xl font-semibold text-[var(--color-text)]">
        {t('dictionary.title')}
      </h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="vd: 我可以游泳, 指导, bukeqi, ming2tian1"
            className={cn(
              'w-full pl-9 pr-3 py-2 rounded-lg text-sm font-cjk',
              'bg-[var(--color-bg-surface)] text-[var(--color-text)]',
              'border border-[var(--color-border)] focus:border-[var(--color-primary)]',
              'outline-none transition-colors placeholder:text-[var(--color-text-muted)] placeholder:font-sans'
            )}
          />
        </div>
        <Button type="submit" isLoading={loading}>{t('dictionary.title')}</Button>
      </form>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          {multiCharResults.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Từ ghép ({multiCharResults.length})
              </p>
              {multiCharResults.map((entry) => (
                <EntryCard key={entry.char} entry={entry} isMultiChar={true}
                  onNoteSaved={(note) => handleNoteSaved(entry.char, note)} />
              ))}
            </div>
          )}

          {freeSingles.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Đơn chữ ({freeSingles.length})
              </p>
              {freeSingles.map((entry) => (
                <EntryCard key={entry.char} entry={entry} isMultiChar={false}
                  onNoteSaved={(note) => handleNoteSaved(entry.char, note)} />
              ))}
            </div>
          )}

          {coveredSingles.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Thành phần từ ghép ({coveredSingles.length})
              </p>
              {coveredSingles.map((entry) => (
                <EntryCard key={entry.char} entry={entry} isMultiChar={false}
                  onNoteSaved={(note) => handleNoteSaved(entry.char, note)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
