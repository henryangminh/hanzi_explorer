import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookmarkPlus, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { isSeparablePinyin } from '@/lib/pinyin'
import { STATUS_RIPPLE_COLOR, statusClass, toggleStatus } from '@/lib/flashcardStatus'
import { useRipple } from '@/hooks/useRipple'
import { FlashcardStatusButtons } from '@/components/ui/FlashcardStatusButtons'
import { Ripple } from '@/components/ui/Ripple'
import type { DictLiteResponse, FlashcardStatus } from '@/types'
import { CharDetailPanel } from '@/features/char-detail/CharDetailPanel'
import { SaveToNotebookModal } from '@/features/shared/SaveToNotebookModal'
import { entryPreview } from '../entryPreview'
import { EntrySummary } from './EntrySummary'

const ICON_BUTTON = 'p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] transition-colors'

interface EntryCardProps {
  entry: DictLiteResponse
  pinyinFilter?: string
  autoExpand?: boolean
  status: FlashcardStatus | null
  /** Learned-status buttons are only shown to logged-in users. */
  showStatus: boolean
  onStatusChange: (char: string, status: FlashcardStatus | null) => void
  onWordClick: (word: string) => void
}

/** A search result: summary header (click to expand) and the full detail panel when expanded. */
export function EntryCard({ entry, pinyinFilter, autoExpand = false, status, showStatus, onStatusChange, onWordClick }: EntryCardProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(!autoExpand)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const { ripple, trigger } = useRipple()
  const marked = statusClass(status)
  const isSeparable = entry.xdhy?.some((x) => isSeparablePinyin(x.pinyin))
  const hskLevel = entry.cedict[0]?.hsk_level

  function handleStatus(clicked: FlashcardStatus, e: React.MouseEvent) {
    e.stopPropagation()
    trigger(e, cardRef.current, STATUS_RIPPLE_COLOR[clicked])
    onStatusChange(entry.char, toggleStatus(status, clicked))
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative border rounded-xl overflow-hidden',
        !marked && (entry.char.length > 1 ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]'),
        marked,
      )}
    >
      <Ripple ripple={ripple} />
      {saveModalOpen && <SaveToNotebookModal char={entry.char} onClose={() => setSaveModalOpen(false)} />}

      <div
        className={cn(
          'relative flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer',
          marked ? 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5' : 'bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-subtle)]',
        )}
        onClick={() => {
          if (window.getSelection()?.toString()) return // don't toggle while selecting text
          setCollapsed((v) => !v)
        }}
      >
        <EntrySummary entry={entry} preview={entryPreview(entry)} />

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {hskLevel && (
            <span className="text-xs bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-full text-[var(--color-text-muted)]">HSK {hskLevel}</span>
          )}
          {isSeparable && (
            <span className="text-xs px-2 py-0.5 rounded border border-[var(--color-accent)] text-[var(--color-accent)] shrink-0">
              {t('dictionary.separable')}
            </span>
          )}
          {showStatus && <FlashcardStatusButtons status={status} size="sm" onClick={handleStatus} />}
          <button onClick={() => setSaveModalOpen(true)} className={cn(ICON_BUTTON, 'hover:text-[var(--color-primary)]')} title={t('notebooks.saveToNotebook')}>
            <BookmarkPlus size={14} />
          </button>
          <button title={`${t('common.expand')} / ${t('common.collapse')}`} onClick={() => setCollapsed((v) => !v)} className={ICON_BUTTON}>
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 pt-2 border-t border-[var(--color-border)] bg-[var(--color-bg-surface)]">
          <CharDetailPanel char={entry.char} initialEntry={entry} pinyinFilter={pinyinFilter} showNotes onWordClick={onWordClick} />
        </div>
      )}
    </div>
  )
}
