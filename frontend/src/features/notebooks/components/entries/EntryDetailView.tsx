import { useTranslation } from 'react-i18next'
import { BookmarkPlus, ChevronLeft } from 'lucide-react'
import { useGoToDictionary } from '@/hooks/useGoToDictionary'
import { CharDetailPanel } from '@/features/char-detail/CharDetailPanel'

/** One word of the notebook in detail, with back and "save to another notebook" buttons. */
export function EntryDetailView({ char, onBack, onSave }: { char: string; onBack: () => void; onSave: () => void }) {
  const { t } = useTranslation()
  const goToDictionary = useGoToDictionary()
  return (
    <div className="flex flex-col gap-4 pt-3">
      <div className="flex items-center justify-between">
        <button
          title={t('common.back')}
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ChevronLeft size={14} />
          {t('common.back')}
        </button>
        <button
          onClick={onSave}
          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          title={t('notebooks.saveToNotebook')}
        >
          <BookmarkPlus size={15} />
        </button>
      </div>
      {/* CharDetailPanel self-manages: shows DB data first, then lazy-loads Wiktionary */}
      <CharDetailPanel char={char} showNotes onWordClick={goToDictionary} />
    </div>
  )
}
