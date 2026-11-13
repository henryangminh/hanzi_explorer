import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useClickOutside } from '@/hooks/useClickOutside'
import { ALL_ENTRY_FILTERS, type EntryFilter } from './entryFilter'

const LABEL_KEYS: Record<EntryFilter, string> = {
  learned: 'flashcards.learned',
  not_learned: 'flashcards.unlearned',
  unseen: 'notebooks.unseen',
}

/** Multi-select dropdown; at least one status always stays selected. */
export function EntryStatusFilter({ selected, onChange }: {
  selected: Set<EntryFilter>
  onChange: (next: Set<EntryFilter>) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, open, () => setOpen(false))
  const filtered = selected.size < ALL_ENTRY_FILTERS.length

  function toggle(key: EntryFilter) {
    const next = new Set(selected)
    if (next.has(key)) { if (next.size > 1) next.delete(key) }
    else next.add(key)
    onChange(next)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap',
          'text-sm px-3 py-1.5 rounded-lg',
          'border border-[var(--color-border-md)]',
          'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)]',
          'hover:bg-[var(--color-bg-subtle)] transition-colors outline-none cursor-pointer',
          filtered && 'border-[var(--color-primary)] text-[var(--color-primary)]',
        )}
      >
        {t('notebooks.filter')} {filtered && `(${selected.size})`}
        <ChevronDown size={13} className={cn('transition-transform duration-150 shrink-0', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 z-[200] w-36 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden py-1">
          {ALL_ENTRY_FILTERS.map((key) => (
            <label key={key} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[var(--color-bg-subtle)] transition-colors">
              <input
                type="checkbox"
                checked={selected.has(key)}
                onChange={() => toggle(key)}
                className="accent-[var(--color-primary)] w-3.5 h-3.5"
              />
              <span className="text-sm text-[var(--color-text)]">{t(LABEL_KEYS[key])}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
