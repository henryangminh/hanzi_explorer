import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Flag } from 'lucide-react'
import { cn } from '@/lib/cn'
import { STATUS_RIPPLE_COLOR, statusClass, toggleStatus } from '@/lib/flashcardStatus'
import { useRipple } from '@/hooks/useRipple'
import { Ripple } from '@/components/ui/Ripple'
import type { DictLiteResponse, FlashcardStatus } from '@/types'
import { CharDetailPanel } from '@/features/char-detail/CharDetailPanel'
import { ReportWordModal } from '@/features/shared/ReportWordModal'
import { SaveToNotebookModal } from '@/features/shared/SaveToNotebookModal'
import { entryPreview } from '../entryPreview'
import { EntryActions } from './EntryActions'
import { EntrySummary } from './EntrySummary'

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
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const { ripple, trigger } = useRipple()
  const marked = statusClass(status)

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
      {reportModalOpen && <ReportWordModal char={entry.char} onClose={() => setReportModalOpen(false)} />}

      <div
        className={cn(
          'relative flow-root px-4 py-3 transition-colors cursor-pointer',
          marked ? 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5' : 'bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-subtle)]',
        )}
        onClick={() => {
          if (window.getSelection()?.toString()) return // don't toggle while selecting text
          setCollapsed((v) => !v)
        }}
      >
        {/* Floated so the text below the buttons can use the full width */}
        <div className="float-right ml-3 mb-1">
          <EntryActions
            char={entry.char}
            status={status}
            showStatus={showStatus}
            collapsed={collapsed}
            onStatus={handleStatus}
            onSave={() => setSaveModalOpen(true)}
            onToggle={() => setCollapsed((v) => !v)}
          />
        </div>
        <EntrySummary entry={entry} preview={entryPreview(entry)} showTags={collapsed} />
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 pt-2 border-t border-[var(--color-border)] bg-[var(--color-bg-surface)]">
          <CharDetailPanel char={entry.char} initialEntry={entry} pinyinFilter={pinyinFilter} showHeading={false} showNotes onWordClick={onWordClick} />
          {/* Reporting sits at the end of the entry, once it has been read, instead of crowding the header */}
          <button
            onClick={() => setReportModalOpen(true)}
            className="mt-4 ml-auto flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
          >
            <Flag size={12} />
            {t('report.title')}
          </button>
        </div>
      )}
    </div>
  )
}
