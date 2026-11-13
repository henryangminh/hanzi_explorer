import { useTranslation } from 'react-i18next'
import { RotateCcw, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { useDraggablePanel } from './useDraggablePanel'
import { useHandwritingCanvas } from './useHandwritingCanvas'

interface Props {
  onInsertChar: (char: string) => void
  onClose: () => void
}

/** Floating panel (no backdrop, so the search box stays usable): draw a character, pick a candidate. */
export function HandwritingPad({ onInsertChar, onClose }: Props) {
  const { t } = useTranslation()
  const { panelRef, offset, onPointerDown } = useDraggablePanel()
  const { canvasRef, candidates, recognizing, isEmpty, clear, undo } = useHandwritingCanvas()

  return (
    <div
      ref={panelRef}
      className={cn(
        'bg-[var(--color-bg-surface)] shadow-xl flex flex-col gap-3 transition-shadow',
        'w-full rounded-t-2xl p-5',
        'sm:w-72 sm:rounded-2xl sm:border sm:border-[var(--color-border)] sm:p-3',
      )}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div className="flex items-center justify-between cursor-move select-none" onPointerDown={onPointerDown}>
        <span className="text-sm font-semibold text-[var(--color-text)] pointer-events-none">{t('handwriting.title')}</span>
        <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer">
          <X size={16} />
        </button>
      </div>

      <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-[var(--color-border)] bg-white">
        <canvas ref={canvasRef} className="w-full h-full touch-none cursor-crosshair" style={{ display: 'block' }} />
        {isEmpty && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-gray-300 pointer-events-none select-none">
            {t('handwriting.hint')}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={undo} disabled={isEmpty} className="flex-1 justify-center" title={t('handwriting.undo')}>
          <RotateCcw size={13} />
          {t('handwriting.undo')}
        </Button>
        <Button variant="outline" size="sm" onClick={clear} disabled={isEmpty} className="flex-1 justify-center">
          <Trash2 size={13} />
          {t('handwriting.clear')}
        </Button>
      </div>

      {/* Candidates — tap to insert at the cursor */}
      <div className="min-h-[44px] flex items-center gap-1 flex-wrap">
        {recognizing ? (
          <span className="text-xs text-[var(--color-text-muted)] animate-pulse w-full">{t('handwriting.recognizing')}</span>
        ) : candidates.map((char) => (
          <button
            key={char}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => { onInsertChar(char); clear() }}
            className="text-base font-cjk leading-none p-1.5 rounded-lg hover:bg-[var(--color-bg-subtle)] transition-colors text-[var(--color-text)]"
            title={char}
          >
            {char}
          </button>
        ))}
      </div>
    </div>
  )
}
