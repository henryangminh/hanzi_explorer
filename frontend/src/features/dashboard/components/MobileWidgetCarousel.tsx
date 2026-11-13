import { useState } from 'react'
import { useSwipe } from '@/hooks/useSwipe'
import type { FlashcardWidgetConfig } from '@/store/flashcard.store'
import type { NotebookResponse } from '@/types'
import { FlashcardWidget } from '@/features/widgets/FlashcardWidget'
import { AddWidgetButton } from './AddWidgetButton'
import { CarouselDots } from './CarouselDots'

interface MobileWidgetCarouselProps {
  widgets: FlashcardWidgetConfig[]
  notebooks: NotebookResponse[]
  canAdd: boolean
  onAdd: () => void
}

/** One widget at a time (plus an "add" slot). All slots share one grid cell so height never jumps. */
export function MobileWidgetCarousel({ widgets, notebooks, canAdd, onAdd }: MobileWidgetCarouselProps) {
  const [index, setIndex] = useState(0)
  const slotCount = widgets.length + (canAdd ? 1 : 0)
  const active = slotCount > 0 ? index % slotCount : 0

  const nav = (dir: 'prev' | 'next') => {
    if (slotCount === 0) return
    setIndex((i) => dir === 'next' ? (i + 1) % slotCount : (i - 1 + slotCount) % slotCount)
  }
  const swipe = useSwipe(nav)
  const slotStyle = (visible: boolean) => ({ visibility: visible ? 'visible' : 'hidden', pointerEvents: visible ? 'auto' : 'none' }) as const

  return (
    <div className="sm:hidden flex flex-col gap-3">
      <div className="grid grid-rows-1 grid-cols-1 [touch-action:pan-y]" {...swipe}>
        {widgets.map((w, i) => (
          <div key={w.id} className="row-start-1 col-start-1" style={slotStyle(i === active)}>
            <FlashcardWidget widget={w} allNotebooks={notebooks} />
          </div>
        ))}
        {canAdd && (
          <div className="row-start-1 col-start-1 flex items-center justify-center" style={slotStyle(active === widgets.length)}>
            <AddWidgetButton onClick={onAdd} className="w-full" />
          </div>
        )}
      </div>
      {slotCount > 1 && <CarouselDots count={slotCount} active={active} onNav={nav} />}
    </div>
  )
}
