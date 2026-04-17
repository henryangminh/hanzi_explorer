import { X, Check } from 'lucide-react'
import type { FlashcardEntry } from '@/types'

interface FlashcardProps {
  card: FlashcardEntry
}

export function Flashcard({ card }: FlashcardProps) {
  return (
    <div className="flex flex-col bg-[var(--color-bg)] border border-[var(--color-border-md)] rounded-xl shadow w-full min-h-[304px]">
      {/* Character + pinyin */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-6 pb-3 gap-1.5">
        <span className="font-cjk text-5xl font-bold text-[var(--color-text)] leading-none select-none">
          {card.char}
        </span>
        {card.pinyins.length > 0 && (
          <span className="text-xs text-[var(--color-primary)] font-medium tracking-wide">
            {card.pinyins[0]}
          </span>
        )}
      </div>

      <div className="mx-3 border-t border-[var(--color-border)]" />

      {/* Meanings */}
      <div className="px-3 py-3 min-h-[64px] flex flex-col gap-1 justify-center">
        {card.cedict_brief && (
          <p className="text-[11px] text-[var(--color-text)] line-clamp-2 leading-snug">
            {card.cedict_brief}
          </p>
        )}
        {card.cvdict_brief && (
          <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2 leading-snug">
            {card.cvdict_brief}
          </p>
        )}
        {!card.cedict_brief && !card.cvdict_brief && (
          <p className="text-[11px] text-[var(--color-text-muted)] italic">—</p>
        )}
      </div>

      <div className="mx-3 border-t border-[var(--color-border)]" />

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-5 py-3">
        <button
          type="button"
          className="w-9 h-9 rounded-full border-2 border-red-400 text-red-400 flex items-center justify-center hover:bg-red-400 hover:text-white transition-colors"
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <X size={15} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          className="w-9 h-9 rounded-full border-2 border-emerald-500 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors"
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <Check size={15} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
