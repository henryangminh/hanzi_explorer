import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ArrowLeft, BookmarkPlus } from 'lucide-react'
import { useRadicalList } from './useRadicals'
import { cn } from '@/lib/cn'
import type { DictionaryResponse, RadicalSummary } from '@/types'
import api from '@/lib/axios'
import { SaveToNotebookModal } from '@/features/notebooks/SaveToNotebookModal'
import { CharDetailBody } from '@/features/dictionary/CharDetailBody'

interface CharCard { char: string; pinyin: string; meaning_en: string }

// ── Char detail panel (inside popup) ─────────────────────

function CharDetail({ char, onBack }: { char: string; onBack: () => void }) {
  const [entry, setEntry] = useState<DictionaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveModalOpen, setSaveModalOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    setEntry(null)
    api.get<DictionaryResponse>(`/dictionary/${encodeURIComponent(char)}`)
      .then(({ data }) => setEntry(data))
      .finally(() => setLoading(false))
  }, [char])

  const firstCedict = entry?.cedict[0] ?? null

  return (
    <div className="flex flex-col h-full">
      {saveModalOpen && (
        <SaveToNotebookModal char={char} onClose={() => setSaveModalOpen(false)} />
      )}
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] shrink-0">
        <button onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-cjk text-4xl text-[var(--color-primary)] leading-none">{char}</span>
          {firstCedict?.traditional && firstCedict.traditional !== char && (
            <span className="font-cjk text-lg text-[var(--color-text-muted)]">({firstCedict.traditional})</span>
          )}
          {firstCedict && (
            <span className="text-sm font-medium text-[var(--color-text)]">
              {firstCedict.pinyin}
              {entry?.sino_vn && entry.sino_vn.length > 0 && (
                <span className="ml-1.5 text-[var(--color-text-muted)]">· {entry.sino_vn.join(', ')}</span>
              )}
              {firstCedict.hsk_level && (
                <span className="ml-2 text-xs bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-full text-[var(--color-primary)]">
                  HSK {firstCedict.hsk_level}
                </span>
              )}
            </span>
          )}
        </div>
        <button
          onClick={() => setSaveModalOpen(true)}
          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors shrink-0"
          title="Thêm vào sổ tay"
        >
          <BookmarkPlus size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && <p className="text-sm text-[var(--color-text-muted)]">Đang tải...</p>}
        {!loading && entry && <CharDetailBody entry={entry} showNotes={false} />}
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
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {chars.map((c) => (
                    <button
                      key={c.char}
                      onClick={() => setSelectedChar(c.char)}
                      className={cn(
                        'flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all cursor-pointer',
                        'bg-[var(--color-bg-surface)] border-[var(--color-border)]',
                        'hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)]',
                        'active:scale-95'
                      )}
                    >
                      <span className="font-cjk text-3xl text-[var(--color-text)] leading-none">{c.char}</span>
                      {c.pinyin && (
                        <span className="text-xs text-[var(--color-text-muted)] leading-tight text-center">
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
