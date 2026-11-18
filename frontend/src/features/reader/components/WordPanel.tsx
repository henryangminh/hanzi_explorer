import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bookmark, X } from 'lucide-react'
import { FlashcardStatusButtons } from '@/components/ui/FlashcardStatusButtons'
import { cn } from '@/lib/cn'
import { toggleStatus } from '@/lib/flashcardStatus'
import { useGoToDictionary } from '@/hooks/useGoToDictionary'
import type { FlashcardStatus, ReaderToken } from '@/types'
import { CharDetailPanel } from '@/features/char-detail/CharDetailPanel'
import { SpeakButton } from '@/features/dictionary/components/SpeakButton'
import { SaveToNotebookModal } from '@/features/shared/SaveToNotebookModal'

const ICON_BUTTON = 'p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors'

interface Props {
  token: ReaderToken & { word: string }
  onStatusChange: (status: FlashcardStatus | null) => void
  onClose: () => void
  className?: string
}

/** The clicked word: hear it, mark it ✓/✗ (✗ puts it under review), save it, and its full entry. */
export function WordPanel({ token, onStatusChange, onClose, className }: Props) {
  const { t } = useTranslation()
  const goToDictionary = useGoToDictionary()
  const [saving, setSaving] = useState(false)

  return (
    <aside className={cn('flex flex-col border border-[var(--color-border)] rounded-xl bg-[var(--color-bg-surface)] overflow-hidden', className)}>
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--color-border)]">
        <SpeakButton text={token.word} iconSize={16} buttonClass={ICON_BUTTON} />
        <button type="button" onClick={() => setSaving(true)} className={ICON_BUTTON} title={t('notebooks.saveToNotebook')}>
          <Bookmark size={16} />
        </button>
        <div className="flex items-center gap-1.5 ml-1">
          <FlashcardStatusButtons status={token.status} size="md" onClick={(clicked) => onStatusChange(toggleStatus(token.status, clicked))} />
        </div>
        <button type="button" onClick={onClose} className={cn(ICON_BUTTON, 'ml-auto')} title={t('common.close')}>
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <CharDetailPanel key={token.word} char={token.word} onWordClick={goToDictionary} />
      </div>
      {saving && <SaveToNotebookModal char={token.word} onClose={() => setSaving(false)} />}
    </aside>
  )
}
