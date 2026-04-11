/**
 * CharDetailPanel — shared component dùng cho mọi nơi hiển thị chi tiết 1 chữ.
 *
 * Nhận `char` (string) hoặc `entry` (DictionaryResponse / DictLiteResponse) sẵn có.
 * Tự động:
 *   1. Hiển thị dữ liệu DB (CEDICT, CVDICT, Hán Việt) ngay lập tức từ `initialEntry` nếu có.
 *   2. Gọi /dictionary/full/{char} để lấy dữ liệu Wiktionary (lazy, có cache phía server).
 *   3. Hiển thị spinner "Đang load thêm dữ liệu..." ở chỗ Wiktionary trong khi chờ.
 *   4. Khi Wiktionary về → render section. Nếu không có → ẩn đi, không để lại dấu vết.
 *
 * Props:
 *   char           — chữ cần tra (bắt buộc)
 *   initialEntry   — dữ liệu lite/full sẵn có (DictLiteResponse hoặc DictionaryResponse)
 *                    nếu bỏ qua, component sẽ tự fetch từ /dictionary/full/{char}
 *   showNotes      — hiện section "Ghi chú của tôi" (chỉ dùng ở Tra từ). Mặc định false.
 *   onNoteSaved    — callback khi lưu ghi chú thành công
 */
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CvdictSection } from './CvdictSection'
import api from '@/lib/axios'
import type { DictionaryResponse, DictLiteResponse, UserNoteResponse } from '@/types'

// DictLiteResponse also has char/cedict/cvdict/sino_vn. We accept both.
type InitialEntry = DictLiteResponse | DictionaryResponse

function isFullEntry(e: InitialEntry): e is DictionaryResponse {
  return 'external' in e
}

interface Props {
  char: string
  initialEntry?: InitialEntry
  showNotes?: boolean
  onDataLoaded?: (entry: DictionaryResponse) => void
  onNoteSaved?: (note: UserNoteResponse) => void
}

export function CharDetailPanel({ char, initialEntry, showNotes = false, onDataLoaded, onNoteSaved }: Props) {
  const { t } = useTranslation()

  // Full entry (with Wiktionary). If initialEntry is already full, use it.
  const [full, setFull] = useState<DictionaryResponse | null>(
    initialEntry && isFullEntry(initialEntry) ? initialEntry : null
  )
  // Lite entry for immediate DB display when no initialEntry provided
  const [lite, setLite] = useState<DictLiteResponse | null>(
    initialEntry && !isFullEntry(initialEntry) ? initialEntry : null
  )
  const [loadingFull, setLoadingFull] = useState(!full)
  const fetchedRef = useRef(false)

  // Note state — seeded from full entry if available
  const [noteMeaningVi, setNoteMeaningVi] = useState(full?.user_note?.meaning_vi ?? '')
  const [noteText, setNoteText] = useState(full?.user_note?.note ?? '')
  const [noteTags, setNoteTags] = useState(full?.user_note?.tags.join(', ') ?? '')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    // Already have a full entry — nothing to do
    if (full) {
      setLoadingFull(false)
      return
    }

    const run = async () => {
      // Phase 1 (only when no initialEntry): fetch lite immediately so DB data
      // shows right away while Wiktionary is still loading in phase 2.
      if (!initialEntry) {
        try {
          const { data } = await api.get<DictLiteResponse>(
            `/dictionary/lookup?q=${encodeURIComponent(char)}`
          )
          setLite(data)
        } catch {
          // ignore — full fetch below will cover it
        }
      }

      // Phase 2: fetch full entry (DB + Wiktionary, uses server-side cache)
      setLoadingFull(true)
      try {
        const { data } = await api.get<DictionaryResponse>(
          `/dictionary/full/${encodeURIComponent(char)}`
        )
        setFull(data)
        setLite(null) // full supersedes lite
        onDataLoaded?.(data)
        setNoteMeaningVi(data.user_note?.meaning_vi ?? '')
        setNoteText(data.user_note?.note ?? '')
        setNoteTags(data.user_note?.tags.join(', ') ?? '')
      } catch {
        // silently fail — lite data (if fetched) stays visible
      } finally {
        setLoadingFull(false)
      }
    }

    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char])

  // When full entry arrives (e.g. passed from parent after search), sync note fields
  useEffect(() => {
    if (full?.user_note) {
      setNoteMeaningVi(full.user_note.meaning_vi ?? '')
      setNoteText(full.user_note.note ?? '')
      setNoteTags(full.user_note.tags.join(', ') ?? '')
    }
  }, [full?.user_note])

  const handleSaveNote = async () => {
    setSavingNote(true)
    try {
      const { data } = await api.put<UserNoteResponse>(
        `/dictionary/${encodeURIComponent(char)}/note`,
        {
          meaning_vi: noteMeaningVi || null,
          note: noteText || null,
          tags: noteTags ? noteTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        }
      )
      setFull((prev) => prev ? { ...prev, user_note: data } : prev)
      onNoteSaved?.(data)
    } finally {
      setSavingNote(false)
    }
  }

  // Resolve the current display source: full → lite (phase-1 fetch or prop) → null
  const liteSource = lite // set either from prop (initialEntry lite) or phase-1 fetch
  const entry = full ?? (liteSource
    ? {
        char: liteSource.char,
        cedict: liteSource.cedict,
        cvdict: liteSource.cvdict,
        sino_vn: liteSource.sino_vn,
        external: [],
        user_note: null,
        hsk_tags: [],
        hanzipy: null,
      } satisfies DictionaryResponse
    : null)

  // If no data at all yet (lite not fetched, full not fetched), show a spinner
  if (!entry) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-[var(--color-text-muted)]">
        <Loader2 size={14} className="animate-spin shrink-0" />
        <span>{t('common.loading')}</span>
      </div>
    )
  }


  const hskTags = full?.hsk_tags ?? []

  return (
    <div className="flex flex-col gap-4">
      {/* Char display: simplified (traditional) */}
      {entry.cedict[0] && (
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-cjk text-3xl text-[var(--color-text)] leading-none">{entry.char}</span>
          {entry.cedict[0].traditional && entry.cedict[0].traditional !== entry.char && (
            <span className="font-cjk text-3xl text-[var(--color-text-muted)] leading-none">({entry.cedict[0].traditional})</span>
          )}
        </div>
      )}

      {/* HSK tags */}
      {hskTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {hskTags.map((tag) => (
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
      {entry.cedict.length > 0 ? (
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
      ) : (
        <p className="text-sm text-[var(--color-text-muted)] italic">{t('dictionary.noResult')}</p>
      )}

      {/* CVDICT */}
      {entry.cvdict?.length > 0 && <CvdictSection entries={entry.cvdict} />}

      {/* Wiktionary — loading placeholder */}
      {loadingFull && (
        <div className="flex items-center gap-2 py-1 text-sm text-[var(--color-text-muted)]">
          <Loader2 size={13} className="animate-spin shrink-0" />
          <span>Đang load thêm dữ liệu...</span>
        </div>
      )}

      {/* Wiktionary — actual data (only shown when full entry arrives) */}
      {!loadingFull && full?.external?.map((src) => {
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

      {/* Notes — only shown when showNotes=true (Tra từ feature) */}
      {showNotes && (
        <div>
          <CardTitle className="mb-2">{t('dictionary.notes')}</CardTitle>
          <div className="flex flex-col gap-2">
            <Input
              id={`vi-${char}`}
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
              id={`tags-${char}`}
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
