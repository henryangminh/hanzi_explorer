import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { PenLine, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { HandwritingPad } from '../handwriting/HandwritingPad'
import { useAnimatedPresence } from '../hooks/useAnimatedPresence'

const MOBILE_MAX_WIDTH = 640

interface SearchFormProps {
  query: string
  onQueryChange: (q: string) => void
  onSearch: (q: string) => void
  searching: boolean
}

/** Search box with clear button, handwriting input and submit. */
export function SearchForm({ query, onQueryChange, onSearch, searching }: SearchFormProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const handwriting = useAnimatedPresence()

  /** Insert a handwritten character at the cursor, keeping the cursor after it. */
  function insertAtCursor(char: string) {
    const input = inputRef.current
    if (!input) {
      onQueryChange(query + char)
      return
    }
    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? input.value.length
    onQueryChange(input.value.slice(0, start) + char + input.value.slice(end))
    requestAnimationFrame(() => input.setSelectionRange(start + char.length, start + char.length))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // On mobile the pad covers the results — close it
    if (window.innerWidth < MOBILE_MAX_WIDTH && handwriting.mounted) handwriting.close()
    onSearch(query)
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t('dictionary.searchPlaceholder')}
            className={cn(
              'w-full pl-9 pr-9 py-2 rounded-lg text-sm font-cjk',
              'bg-[var(--color-bg-surface)] text-[var(--color-text)]',
              'border border-[var(--color-border)] focus:border-[var(--color-primary)]',
              'outline-none transition-colors placeholder:text-[var(--color-text-muted)] placeholder:font-sans',
            )}
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => { onQueryChange(''); inputRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-0.5"
              title={t('common.clear')}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="justify-center flex-none" onClick={handwriting.toggle} title={t('handwriting.title')} aria-label={t('handwriting.title')}>
            <PenLine size={16} />
          </Button>
          {/* Fills the row on mobile, so the label never wraps or gets cut */}
          <Button type="submit" className="flex-1 sm:flex-none justify-center whitespace-nowrap" isLoading={searching}>
            {t('dictionary.title')}
          </Button>
        </div>
      </form>

      {handwriting.mounted && (
        <div
          className={cn(
            'z-[50] transition-all duration-200 ease-out origin-top-right',
            'sm:absolute sm:right-0 sm:top-full sm:mt-1',
            'max-sm:fixed max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:pointer-events-none max-sm:flex max-sm:justify-center',
            handwriting.visible
              ? 'opacity-100 sm:scale-100 max-sm:translate-y-0'
              : 'opacity-0 sm:scale-95 sm:-translate-y-2 max-sm:translate-y-full',
          )}
        >
          <div className="w-full sm:w-auto pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <HandwritingPad onInsertChar={insertAtCursor} onClose={handwriting.close} />
          </div>
        </div>
      )}
    </div>
  )
}
