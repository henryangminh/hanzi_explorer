import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useReaderPrefsStore } from '@/store/readerPrefs.store'
import { HskFilter } from './HskFilter'

interface Props {
  showPinyin: boolean
  onTogglePinyin: () => void
  onEdit: () => void
}

/** Above the analysed text: back to editing, pinyin on/off, the HSK highlight, and what the word styles mean. */
export function ReaderToolbar({ showPinyin, onTogglePinyin, onEdit }: Props) {
  const { t } = useTranslation()
  const hskOn = useReaderPrefsStore((s) => s.hskLevel !== null)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onEdit}>
        <Pencil size={14} /> {t('reader.edit')}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onTogglePinyin}>
        {showPinyin ? <EyeOff size={14} /> : <Eye size={14} />} {showPinyin ? t('reader.hidePinyin') : t('reader.showPinyin')}
      </Button>
      <HskFilter />
      <div className="ml-auto flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
        <span>{t('reader.legendLearned')}</span>
        <span className="text-[var(--color-text)] underline decoration-red-400 decoration-2 underline-offset-4">{t('reader.legendNotLearned')}</span>
        {hskOn && <span className="rounded px-1 text-[var(--color-text)] bg-[var(--color-highlight)]">{t('reader.legendAboveLevel')}</span>}
      </div>
    </div>
  )
}
