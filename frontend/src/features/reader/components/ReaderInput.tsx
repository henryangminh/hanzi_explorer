import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export const MAX_READER_TEXT = 5000

interface Props {
  text: string
  onTextChange: (text: string) => void
  onSubmit: () => void
  loading: boolean
  error: boolean
}

/** Where the text to read is pasted. */
export function ReaderInput({ text, onTextChange, onSubmit, loading, error }: Props) {
  const { t } = useTranslation()
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        maxLength={MAX_READER_TEXT}
        rows={8}
        placeholder={t('reader.placeholder')}
        className={cn(
          'w-full px-3 py-2 rounded-lg text-base font-cjk resize-y',
          'bg-[var(--color-bg-surface)] text-[var(--color-text)]',
          'border border-[var(--color-border)] focus:border-[var(--color-primary)]',
          'outline-none transition-colors placeholder:text-[var(--color-text-muted)] placeholder:font-sans placeholder:text-sm',
        )}
      />
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-xs', error ? 'text-red-500' : 'text-[var(--color-text-muted)]')}>
          {error ? t('reader.error') : t('dictionary.charCount', { current: text.length, max: MAX_READER_TEXT })}
        </span>
        <Button type="submit" isLoading={loading} disabled={!text.trim()}>
          {t('reader.read')}
        </Button>
      </div>
    </form>
  )
}
