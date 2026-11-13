import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { Input } from '@/components/ui/Input'
import { MAX_NOTE_DETAIL, MAX_NOTE_TITLE, type NoteDraft } from './useNoteDraft'

interface NoteFieldsProps {
  id: string
  draft: NoteDraft
  detailRows?: number
  /** Background of the detail box: `subtle` when the form sits on a surface-colored panel. */
  detailTone?: 'surface' | 'subtle'
  gapClass?: string
}

/** Title input and detail textarea, each with a character counter. */
export function NoteFields({ id, draft, detailRows = 3, detailTone = 'surface', gapClass = 'gap-1.5' }: NoteFieldsProps) {
  const { t } = useTranslation()
  const counter = (current: number, max: number) => (
    <span className="text-xs text-[var(--color-text-muted)] text-right">{t('dictionary.charCount', { current, max })}</span>
  )

  return (
    <>
      <div className={cn('flex flex-col', gapClass)}>
        <Input
          id={id}
          label={t('dictionary.noteTitle')}
          value={draft.title}
          onChange={(e) => draft.setTitle(e.target.value)}
          placeholder={t('dictionary.noteTitlePlaceholder')}
          autoFocus
          maxLength={MAX_NOTE_TITLE}
        />
        {counter(draft.title.length, MAX_NOTE_TITLE)}
      </div>
      <div className={cn('flex flex-col', gapClass)}>
        <label className="text-sm font-medium text-[var(--color-text)]">{t('dictionary.noteDetail')}</label>
        <textarea
          value={draft.detail}
          onChange={(e) => draft.setDetail(e.target.value)}
          placeholder={t('dictionary.noteDetailPlaceholder')}
          rows={detailRows}
          maxLength={MAX_NOTE_DETAIL}
          className={cn(
            'w-full px-3 py-2 rounded-lg text-sm resize-none text-[var(--color-text)]',
            detailTone === 'subtle' ? 'bg-[var(--color-bg-subtle)]' : 'bg-[var(--color-bg-surface)]',
            'border border-[var(--color-border)] focus:border-[var(--color-primary)]',
            'outline-none transition-colors placeholder:text-[var(--color-text-muted)]',
          )}
        />
        {counter(draft.detail.length, MAX_NOTE_DETAIL)}
      </div>
    </>
  )
}
