import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { STATUS_RIPPLE_COLOR, statusClass, toggleStatus } from '@/lib/flashcardStatus'
import { formatSeparable } from '@/lib/pinyin'
import { ColorizedHanzi, ColorizedPinyin } from '@/lib/pinyinColor'
import { useRipple } from '@/hooks/useRipple'
import { Ripple } from '@/components/ui/Ripple'
import { FlashcardStatusButtons } from '@/components/ui/FlashcardStatusButtons'
import type { FlashcardStatus, NotebookEntryPreview } from '@/types'

const stopClick = (e: React.MouseEvent) => e.stopPropagation()

/** Word + traditional form, colorized by tone when the reading is known. Selectable text. */
function EntryHeadword({ entry }: { entry: NotebookEntryPreview }) {
  const pinyin = entry.pinyins[0]
  return (
    <div className="flex items-baseline gap-1.5 flex-wrap min-w-0 select-text" onClick={stopClick}>
      {pinyin
        ? <ColorizedHanzi char={entry.char} pinyin={pinyin} className="font-cjk text-2xl leading-none cursor-text" />
        : <span className="font-cjk text-2xl text-[var(--color-text)] leading-none cursor-text">{entry.char}</span>}
      {entry.traditional && (
        <span className="font-cjk text-2xl text-[var(--color-text-muted)] leading-none cursor-text">
          ({pinyin ? <ColorizedHanzi char={entry.traditional} pinyin={pinyin} /> : entry.traditional})
        </span>
      )}
    </div>
  )
}

/** All readings, then the Hán Việt. */
function EntryReadings({ entry }: { entry: NotebookEntryPreview }) {
  if (entry.pinyins.length === 0) return null
  return (
    <p className="w-fit text-sm leading-tight cursor-text select-text" onClick={stopClick}>
      {entry.pinyins.map((p, i) => (
        <span key={i}>
          {i > 0 && <span className="text-[var(--color-text-muted)]">, </span>}
          <ColorizedPinyin pinyin={formatSeparable(p, entry.is_separable)} />
        </span>
      ))}
      {entry.sino_vn?.length > 0 && (
        <span className="text-[var(--color-primary)]"> · {entry.sino_vn.join(', ')}</span>
      )}
    </p>
  )
}

function BriefMeaning({ text, className }: { text: string | null; className: string }) {
  if (!text) return null
  return (
    <p className={cn('w-fit max-w-full text-sm line-clamp-1 leading-tight cursor-text select-text', className)} onClick={stopClick}>
      {text}
    </p>
  )
}

interface EntryCardProps {
  entry: NotebookEntryPreview
  status: FlashcardStatus | null | undefined
  removable: boolean
  removing: boolean
  onSelect: () => void
  onStatusChange: (status: FlashcardStatus | null) => void
  onRemove: () => void
}

/** A word in a notebook: headword, readings, brief meanings, status and remove buttons. */
export function EntryCard({ entry, status, removable, removing, onSelect, onStatusChange, onRemove }: EntryCardProps) {
  const { t } = useTranslation()
  const cardRef = useRef<HTMLDivElement>(null)
  const { ripple, trigger } = useRipple()

  function handleStatus(clicked: FlashcardStatus, e: React.MouseEvent) {
    e.stopPropagation()
    trigger(e, cardRef.current, STATUS_RIPPLE_COLOR[clicked])
    onStatusChange(toggleStatus(status, clicked))
  }

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      className={cn(
        'relative overflow-hidden text-left flex flex-col gap-1 px-3 py-2.5 rounded-xl border transition-colors cursor-pointer',
        statusClass(status) ?? 'nb-card-unseen border-[var(--color-border)] hover:border-[var(--color-primary)]',
      )}
    >
      <Ripple ripple={ripple} />
      <div className="flex items-start justify-between gap-1.5">
        <EntryHeadword entry={entry} />
        <div className="flex items-center gap-1 shrink-0 mt-0.5" onClick={stopClick}>
          <FlashcardStatusButtons status={status} size="xs" onClick={handleStatus} />
          {removable && (
            <button
              onClick={onRemove}
              disabled={removing}
              className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-red-400 transition-colors disabled:opacity-40"
              title={t('notebooks.removeEntry')}
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>
      <EntryReadings entry={entry} />
      <BriefMeaning text={entry.cedict_brief} className="text-[var(--color-text-muted)]" />
      <BriefMeaning text={entry.cvdict_brief} className="text-[var(--color-primary)]" />
    </div>
  )
}
