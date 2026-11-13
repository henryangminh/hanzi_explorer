import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { FlashcardStatus } from '@/types'

export type StatusButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE: Record<StatusButtonSize, { button: string; icon: number }> = {
  xs: { button: 'w-5 h-5', icon: 8 },
  sm: { button: 'w-6 h-6 shrink-0', icon: 10 },
  md: { button: 'w-7 h-7', icon: 12 },
  lg: { button: 'w-9 h-9', icon: 15 },
  xl: { button: 'w-12 h-12', icon: 18 },
}

const COLORS: Record<FlashcardStatus, { active: string; idle: string }> = {
  not_learned: {
    active: 'border-red-400 bg-red-400 text-white',
    idle: 'border-red-400 text-red-400 hover:bg-red-400 hover:text-white',
  },
  learned: {
    active: 'border-emerald-500 bg-emerald-500 text-white',
    idle: 'border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white',
  },
}

interface StatusButtonProps {
  kind: FlashcardStatus
  status: FlashcardStatus | null | undefined
  size: StatusButtonSize
  onClick: (kind: FlashcardStatus, e: React.MouseEvent) => void
  /** Keyboard focus is skipped on cards driven by arrow keys / swipe. */
  focusable?: boolean
}

function StatusButton({ kind, status, size, onClick, focusable = true }: StatusButtonProps) {
  const { t } = useTranslation()
  const Icon = kind === 'learned' ? Check : X
  return (
    <button
      type="button"
      onClick={(e) => onClick(kind, e)}
      tabIndex={focusable ? undefined : -1}
      title={t(kind === 'learned' ? 'flashcards.markLearned' : 'flashcards.markNotLearned')}
      className={cn(
        'rounded-full border-2 flex items-center justify-center transition-colors',
        SIZE[size].button,
        status === kind ? COLORS[kind].active : COLORS[kind].idle,
      )}
    >
      <Icon size={SIZE[size].icon} strokeWidth={2.5} />
    </button>
  )
}

interface FlashcardStatusButtonsProps {
  status: FlashcardStatus | null | undefined
  size: StatusButtonSize
  /** Receives the clicked button's status (toggle logic is up to the caller). */
  onClick: (clicked: FlashcardStatus, e: React.MouseEvent) => void
  focusable?: boolean
}

/** The "not learned" (✗) and "learned" (✓) buttons, in that order. */
export function FlashcardStatusButtons({ status, size, onClick, focusable }: FlashcardStatusButtonsProps) {
  return (
    <>
      <StatusButton kind="not_learned" status={status} size={size} onClick={onClick} focusable={focusable} />
      <StatusButton kind="learned" status={status} size={size} onClick={onClick} focusable={focusable} />
    </>
  )
}

const REVEAL_SIZE: Record<'md' | 'lg' | 'xl', string> = {
  md: 'w-7 h-7 text-[11px]',
  lg: 'w-9 h-9 text-sm',
  xl: 'w-12 h-12 text-lg',
}

/** The "?" button that shows / hides a card's reading and meaning. */
export function RevealButton({ shown, size, onClick, focusable = true }: {
  shown: boolean
  size: 'md' | 'lg' | 'xl'
  onClick: (e: React.MouseEvent) => void
  focusable?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={focusable ? undefined : -1}
      className={cn(
        'rounded-full border-2 flex items-center justify-center transition-colors font-bold',
        REVEAL_SIZE[size],
        shown ? 'border-sky-500 bg-sky-500 text-white' : 'border-sky-500 text-sky-500 hover:bg-sky-500 hover:text-white',
      )}
    >
      ?
    </button>
  )
}
