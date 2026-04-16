import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
}

interface SelectProps<T extends string> {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  /** Which side of the trigger the dropdown panel aligns to */
  align?: 'left' | 'right'
  className?: string
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  align = 'left',
  className,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  const selectedLabel = options.find((o) => o.value === value)?.label ?? ''

  return (
    <div ref={containerRef} className={cn('relative w-fit', className)}>
      {/* Trigger — same height as Button size="sm" */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap',
          'text-sm px-3 py-1.5 rounded-lg',
          'border border-[var(--color-border-md)]',
          'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)]',
          'hover:bg-[var(--color-bg-subtle)] transition-colors outline-none cursor-pointer',
        )}
      >
        <span>{selectedLabel}</span>
        <ChevronDown
          size={13}
          className={cn('transition-transform duration-150 shrink-0', open && 'rotate-180')}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={cn(
            'absolute top-full mt-1 z-[200] w-fit',
            'bg-[var(--color-bg-surface)] border border-[var(--color-border)]',
            'rounded-lg shadow-lg overflow-hidden',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className={cn(
                'w-full text-left whitespace-nowrap text-sm px-3 py-1.5 transition-colors',
                o.value === value
                  ? 'bg-[var(--color-border-md)] text-[var(--color-text)]'
                  : 'text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
