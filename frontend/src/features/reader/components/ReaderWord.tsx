import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import type { ReaderToken } from '@/types'

interface Props {
  token: ReaderToken
  showPinyin: boolean
  selected: boolean
  onClick: () => void
}

/** One word of the text with its pinyin above; learned words fade, "not learned" ones are underlined. */
export function ReaderWord({ token, showPinyin, selected, onClick }: Props) {
  const ref = useRef<HTMLButtonElement>(null)

  // Below lg the word panel is a bottom sheet: bring the chosen word up above it
  useEffect(() => {
    if (selected && window.matchMedia('(max-width: 1023px)').matches) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selected])

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={cn(
        'scroll-mt-20 rounded px-0.5 mx-px transition-colors hover:bg-[var(--color-bg-subtle)]',
        selected && 'bg-[var(--color-bg-subtle)] ring-1 ring-[var(--color-primary)]',
        token.status === 'learned' && 'text-[var(--color-text-muted)]',
        token.status === 'not_learned' && 'underline decoration-red-400 decoration-2 underline-offset-4',
      )}
    >
      <ruby>
        {token.text}
        {/* Hidden rather than removed, so lines don't jump when pinyin is toggled */}
        <rt className={cn('text-[0.45em] font-sans text-[var(--color-text-muted)] select-none', !showPinyin && 'invisible')}>
          {token.pinyin}
        </rt>
      </ruby>
    </button>
  )
}
