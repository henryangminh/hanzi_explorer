import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useRadicalList, useRadicalDetail } from './useRadicals'
import { RadialDiagram } from './RadialDiagram'
import { cn } from '@/lib/cn'
import type { CompoundItem, RadicalSummary } from '@/types'
import api from '@/lib/axios'

// ── Char detail popup content (no notes, no failed external) ──

interface CharDetailProps {
  char: string
  onClose: () => void
}

interface CedictEntry { id: number; pinyin: string; traditional: string | null; meaning_en: string; hsk_level: number | null; source_name: string }
interface ExtSource { source: string; label: string; data: { found?: boolean; sections?: { part_of_speech: string; definitions: string[] }[] }; from_cache: boolean }

function CharDetail({ char, onClose }: CharDetailProps) {
  const [cedict, setCedict] = useState<CedictEntry[]>([])
  const [external, setExternal] = useState<ExtSource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/dictionary/${encodeURIComponent(char)}`).then(({ data }) => {
      setCedict(data.cedict ?? [])
      setExternal((data.external ?? []).filter((s: ExtSource) => s.data?.found === true))
    }).finally(() => setLoading(false))
  }, [char])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <span className="font-cjk text-5xl text-[var(--color-primary)]">{char}</span>
          {cedict[0] && (
            <div>
              <p className="font-medium text-lg text-[var(--color-text)]">{cedict[0].pinyin}
                {cedict.length > 1 && <span className="text-sm text-[var(--color-text-muted)] ml-2">+{cedict.length - 1} cách đọc</span>}
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{cedict[0].meaning_en}</p>
            </div>
          )}
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        {loading && <p className="text-sm text-[var(--color-text-muted)]">Đang tải...</p>}

        {/* CC-CEDICT all readings */}
        {cedict.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">CC-CEDICT</p>
            <div className="flex flex-col gap-2">
              {cedict.map((ce, idx) => (
                <div key={ce.id} className={cn('pl-3 flex flex-col gap-0.5', cedict.length > 1 && 'border-l-2 border-[var(--color-border-md)]')}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {cedict.length > 1 && <span className="text-xs font-medium text-[var(--color-primary)]">#{idx + 1}</span>}
                    <span className="font-medium text-[var(--color-text)]">{ce.pinyin}</span>
                    {ce.traditional && <span className="text-xs text-[var(--color-text-muted)]">繁: <span className="font-cjk">{ce.traditional}</span></span>}
                    {ce.hsk_level && <span className="text-xs bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-full text-[var(--color-primary)]">HSK {ce.hsk_level}</span>}
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)]">{ce.meaning_en}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* External sources — only show if found */}
        {external.filter(src => src.data.found).map((src) => (
          <div key={src.source}>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">{src.label}</p>
            <div className="flex flex-col gap-2">
              {src.data.sections?.map((sec, i) => (
                <div key={i}>
                  {sec.part_of_speech && (
                    <span className="text-xs font-medium text-[var(--color-primary)] uppercase tracking-wide">{sec.part_of_speech}</span>
                  )}
                  <ol className="mt-1 flex flex-col gap-1 list-decimal list-inside">
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
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Radical card (grid item) ──────────────────────────────

function RadicalCard({ radical, onClick }: { radical: RadicalSummary; onClick: () => void }) {
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
      <span className="font-cjk text-3xl text-[var(--color-text)] leading-none mt-1">{radical.radical}</span>
      <span className="text-xs text-[var(--color-primary)] font-medium">{radical.pinyin}</span>
      <span className="text-xs text-[var(--color-text-muted)] text-center leading-tight line-clamp-1">
        {radical.meaning_vi ?? radical.meaning_en}
      </span>
    </button>
  )
}

// ── Radial popup ──────────────────────────────────────────

function RadicalPopup({
  radical,
  onClose,
  onSelectChar,
}: {
  radical: RadicalSummary
  onClose: () => void
  onSelectChar: (char: string) => void
}) {
  const { detail, loading, fetch } = useRadicalDetail()

  useEffect(() => { fetch(radical.radical) }, [radical.radical, fetch])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] flex items-center justify-center">
            <span className="font-cjk text-4xl text-[var(--color-primary)]">{radical.radical}</span>
          </div>
          <div>
            <p className="font-semibold text-lg text-[var(--color-text)]">{radical.pinyin}</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {radical.meaning_vi && <span className="mr-2">{radical.meaning_vi}</span>}
              {radical.meaning_en}
            </p>
            {radical.stroke_count && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{radical.stroke_count} nét</p>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Radial diagram + compound grid */}
      {loading && <p className="p-5 text-sm text-[var(--color-text-muted)]">Đang tải...</p>}

      {detail && (
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4">
          {/* Radial diagram */}
          <div className="flex justify-center">
            <RadialDiagram
              detail={detail}
              onSelectCompound={(c: CompoundItem) => onSelectChar(c.char)}
              onSelectRoot={() => onSelectChar(radical.radical)}
            />
          </div>

          {/* Compound grid */}
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              Các từ liên quan ({detail.compounds.length})
            </p>
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
              {detail.compounds.map((c) => (
                <button
                  key={c.char}
                  onClick={() => onSelectChar(c.char)}
                  title={`${c.pinyin} — ${c.meaning_en}`}
                  className={cn(
                    'flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all cursor-pointer',
                    'bg-[var(--color-bg-surface)] border-[var(--color-border)]',
                    'hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)]',
                    'active:scale-95'
                  )}
                >
                  <span className="font-cjk text-2xl text-[var(--color-text)]">{c.char}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">{c.pinyin}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modal wrapper ─────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  // Close on backdrop click
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

  const [selectedRadical, setSelectedRadical] = useState<RadicalSummary | null>(null)
  const [selectedChar, setSelectedChar] = useState<string | null>(null)

  // Sort by stroke count asc, nulls last
  const sorted = [...radicals].sort((a, b) => {
    if (a.stroke_count == null && b.stroke_count == null) return 0
    if (a.stroke_count == null) return 1
    if (b.stroke_count == null) return -1
    return a.stroke_count - b.stroke_count
  })

  // Group by stroke count
  const groups = sorted.reduce<Record<number, RadicalSummary[]>>((acc, r) => {
    const key = r.stroke_count ?? 0
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  const handleSelectChar = useCallback((char: string) => {
    setSelectedChar(char)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{t('radicals.title')}</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">{t('radicals.subtitle')}</p>
      </div>

      {loading && <p className="text-sm text-[var(--color-text-muted)]">{t('common.loading')}</p>}

      {/* Grouped grid */}
      <div className="flex flex-col gap-5">
        {Object.entries(groups).map(([strokes, items]) => (
          <div key={strokes}>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              {strokes} nét
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {items.map((r) => (
                <RadicalCard
                  key={r.id}
                  radical={r}
                  onClick={() => setSelectedRadical(r)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Radical popup */}
      {selectedRadical && !selectedChar && (
        <Modal onClose={() => setSelectedRadical(null)}>
          <RadicalPopup
            radical={selectedRadical}
            onClose={() => setSelectedRadical(null)}
            onSelectChar={handleSelectChar}
          />
        </Modal>
      )}

      {/* Char detail popup */}
      {selectedChar && (
        <Modal onClose={() => setSelectedChar(null)}>
          <CharDetail
            char={selectedChar}
            onClose={() => setSelectedChar(null)}
          />
        </Modal>
      )}
    </div>
  )
}
