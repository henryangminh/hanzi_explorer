import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ArrowLeft } from 'lucide-react'
import { useRadicalList } from './useRadicals'
import { cn } from '@/lib/cn'
import type { RadicalSummary } from '@/types'
import api from '@/lib/axios'

// ── Types ─────────────────────────────────────────────────

interface CharCard { char: string; pinyin: string; meaning_en: string }
interface CedictEntry { id: number; pinyin: string; traditional: string | null; meaning_en: string; hsk_level: number | null }
interface CvdictEntry { id: number; pinyin: string; traditional: string | null; meaning_vi: string; hsk_level: number | null }
interface ExtSource { source: string; label: string; data: { found?: boolean; sections?: { part_of_speech: string; definitions: string[] }[] }; from_cache: boolean }

// ── Char detail panel (inside popup) ─────────────────────

function CharDetail({ char, onBack }: { char: string; onBack: () => void }) {
  const [cedict, setCedict] = useState<CedictEntry[]>([])
  const [cvdict, setCvdict] = useState<CvdictEntry[]>([])
  const [external, setExternal] = useState<ExtSource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/dictionary/${encodeURIComponent(char)}`).then(({ data }) => {
      setCedict(data.cedict ?? [])
      setCvdict(data.cvdict ?? [])
      setExternal((data.external ?? []).filter((s: ExtSource) => s.data?.found === true))
    }).finally(() => setLoading(false))
  }, [char])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] shrink-0">
        <button onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-baseline gap-1.5">
          <span className="font-cjk text-4xl text-[var(--color-primary)] leading-none">{char}</span>
          {cedict[0]?.traditional && cedict[0].traditional !== char && (
            <span className="font-cjk text-lg text-[var(--color-text-muted)]">({cedict[0].traditional})</span>
          )}
        </div>
        {cedict[0] && (
          <div>
            <span className="font-medium text-[var(--color-text)]">{cedict[0].pinyin}</span>
            {cedict[0].hsk_level && (
              <span className="ml-2 text-xs bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-full text-[var(--color-primary)]">
                HSK {cedict[0].hsk_level}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
        {loading && <p className="text-sm text-[var(--color-text-muted)]">Đang tải...</p>}

        {/* CC-CEDICT */}
        {cedict.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              CC-CEDICT
            </p>
            <div className="flex flex-col gap-2">
              {cedict.map((ce, idx) => (
                <div key={ce.id} className={cn(
                  'pl-3 flex flex-col gap-0.5',
                  cedict.length > 1 && 'border-l-2 border-[var(--color-border-md)]'
                )}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {cedict.length > 1 && (
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
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && cedict.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)] italic">Không có trong CC-CEDICT</p>
        )}

        {/* CVDICT */}
        {cvdict.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              CVDICT
            </p>
            <div className="flex flex-col gap-2">
              {cvdict.map((cv, idx) => (
                <div key={cv.id} className={cn(
                  'pl-3 flex flex-col gap-0.5',
                  cvdict.length > 1 && 'border-l-2 border-[var(--color-border-md)]'
                )}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {cvdict.length > 1 && (
                      <span className="text-xs font-medium text-[var(--color-primary)]">#{idx + 1}</span>
                    )}
                    <span className="font-medium text-[var(--color-text)]">{cv.pinyin}</span>
                    {cv.traditional && (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        繁: <span className="font-cjk">{cv.traditional}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)]">{cv.meaning_vi}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* External sources */}
        {external.map((src) => (
          <div key={src.source}>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              {src.label}
            </p>
            {src.data.sections?.map((sec, i) => (
              <div key={i} className="flex flex-col gap-1">
                {sec.part_of_speech && (
                  <span className="text-xs font-medium text-[var(--color-primary)] uppercase tracking-wide">
                    {sec.part_of_speech}
                  </span>
                )}
                <ol className="flex flex-col gap-0.5 list-decimal list-inside">
                  {sec.definitions.map((def, j) => {
                    const isExample = def.startsWith('→')
                    return isExample ? (
                      <li key={j} className="list-none ml-4 text-sm italic" style={{ color: 'var(--color-accent)' }}>{def}</li>
                    ) : (
                      <li key={j} className="text-sm text-[var(--color-text)]">{def}</li>
                    )
                  })}
                </ol>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Radical char grid popup ───────────────────────────────

function RadicalPopup({
  radical,
  onClose,
}: {
  radical: RadicalSummary
  onClose: () => void
}) {
  const [chars, setChars] = useState<CharCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChar, setSelectedChar] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setSelectedChar(null)
    api.get(`/radicals/${encodeURIComponent(radical.radical)}/chars`)
      .then(({ data }) => setChars(data.chars ?? []))
      .finally(() => setLoading(false))
  }, [radical.radical])

  return (
    <div className="flex flex-col h-full">
      {selectedChar ? (
        <CharDetail char={selectedChar} onBack={() => setSelectedChar(null)} />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                {radical.radical.split(',').map((form) => (
                  <div key={form} className="w-14 h-14 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] flex items-center justify-center">
                    <span className="font-cjk text-4xl text-[var(--color-primary)]">{form}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="font-semibold text-lg text-[var(--color-text)]">{radical.pinyin}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {radical.meaning_en && <span className="mr-1">{radical.meaning_en}</span>}
                  {radical.meaning_vi && <span>· {radical.meaning_vi}</span>}
                </p>
                {radical.stroke_count && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{radical.stroke_count} nét</p>
                )}
              </div>
            </div>
            <button onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Char grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading && (
              <p className="text-sm text-[var(--color-text-muted)]">Đang tải...</p>
            )}
            {!loading && chars.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)] italic">Không có dữ liệu</p>
            )}
            {!loading && chars.length > 0 && (
              <>
                <p className="text-xs text-[var(--color-text-muted)] mb-3">
                  {chars.length} chữ có chứa bộ thủ này
                </p>
                <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-2">
                  {chars.map((c) => (
                    <button
                      key={c.char}
                      onClick={() => setSelectedChar(c.char)}
                      className={cn(
                        'flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border transition-all cursor-pointer',
                        'bg-[var(--color-bg-surface)] border-[var(--color-border)]',
                        'hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)]',
                        'active:scale-95'
                      )}
                    >
                      <span className="font-cjk text-xl text-[var(--color-text)] leading-none">{c.char}</span>
                      {c.pinyin && (
                        <span className="text-[9px] text-[var(--color-text-muted)] leading-tight text-center">
                          {c.pinyin}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Radical card ──────────────────────────────────────────

function RadicalCard({ radical, onClick }: { radical: RadicalSummary; onClick: () => void }) {
  const displayRadical = radical.radical.split(',').join('、')
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all cursor-pointer',
        'bg-[var(--color-bg-surface)] border-[var(--color-border)]',
        'hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)]',
        'active:scale-95'
      )}
    >
      <span className="font-cjk text-3xl text-[var(--color-text)] leading-none mt-1">{displayRadical}</span>
      <span className="text-xs text-[var(--color-primary)] font-medium">{radical.pinyin}</span>
      <span className="text-xs text-[var(--color-text-muted)] text-center leading-tight line-clamp-1">
        {radical.meaning_en ?? radical.meaning_vi}
      </span>
    </button>
  )
}

// ── Modal ─────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className={cn(
          'w-full sm:max-w-2xl bg-[var(--color-bg-surface)] flex flex-col',
          'rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)]',
          'h-[92vh] sm:h-[85vh]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────

export function RadicalsPage() {
  const { t } = useTranslation()
  const { radicals, loading } = useRadicalList()
  const [selected, setSelected] = useState<RadicalSummary | null>(null)

  const sorted = [...radicals].sort((a, b) => {
    if (a.stroke_count == null) return 1
    if (b.stroke_count == null) return -1
    return a.stroke_count - b.stroke_count
  })

  const groups = sorted.reduce<Record<number, RadicalSummary[]>>((acc, r) => {
    const key = r.stroke_count ?? 0
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{t('radicals.title')}</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">{t('radicals.subtitle')}</p>
      </div>

      {loading && <p className="text-sm text-[var(--color-text-muted)]">{t('common.loading')}</p>}

      <div className="flex flex-col gap-5">
        {Object.entries(groups).map(([strokes, items]) => (
          <div key={strokes}>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              {strokes} nét · {items.length} bộ
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {items.map((r) => (
                <RadicalCard key={r.id} radical={r} onClick={() => setSelected(r)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <RadicalPopup radical={selected} onClose={() => setSelected(null)} />
        </Modal>
      )}
    </div>
  )
}
