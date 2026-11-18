import { useTranslation } from 'react-i18next'
import { Bookmark, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { FlashcardStatusButtons } from '@/components/ui/FlashcardStatusButtons'
import type { FlashcardStatus } from '@/types'
import { SpeakButton } from './SpeakButton'

const ICON_BUTTON = 'p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] transition-colors'
const ICON_SIZE = 18

interface EntryActionsProps {
  char: string
  status: FlashcardStatus | null
  /** Learned-status buttons are only shown to logged-in users. */
  showStatus: boolean
  collapsed: boolean
  onStatus: (clicked: FlashcardStatus, e: React.MouseEvent) => void
  onSave: () => void
  onToggle: () => void
}

/** A search result's buttons in a narrow two-column block (save · expand / ✗ · ✓ / listen · slow), so the word gets the width. */
export function EntryActions({ char, status, showStatus, collapsed, onStatus, onSave, onToggle }: EntryActionsProps) {
  const { t } = useTranslation()
  return (
    <div
      className="shrink-0 grid grid-cols-2 gap-x-1.5 gap-y-2.5 justify-items-center items-center"
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={onSave} className={cn(ICON_BUTTON, 'hover:text-[var(--color-primary)]')} title={t('notebooks.saveToNotebook')}>
        <Bookmark size={ICON_SIZE} />
      </button>
      <button title={`${t('common.expand')} / ${t('common.collapse')}`} onClick={onToggle} className={ICON_BUTTON}>
        {collapsed ? <ChevronDown size={ICON_SIZE} /> : <ChevronUp size={ICON_SIZE} />}
      </button>
      {showStatus && <FlashcardStatusButtons status={status} size="sm" onClick={onStatus} />}
      <SpeakButton text={char} iconSize={ICON_SIZE} buttonClass={cn(ICON_BUTTON, 'hover:text-[var(--color-primary)]')} />
    </div>
  )
}
