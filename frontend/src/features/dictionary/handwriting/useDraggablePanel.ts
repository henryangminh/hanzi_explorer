import { useRef, useState } from 'react'

const MIN_TOP_PX = 60 // keep the panel below the navbar
const DESKTOP_MIN_WIDTH = 640

/** Drag a floating panel by its handle (desktop only). Returns the panel ref, its offset and the handle's onPointerDown. */
export function useDraggablePanel() {
  const panelRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  function onPointerDown(e: React.PointerEvent) {
    if (window.innerWidth < DESKTOP_MIN_WIDTH || e.button !== 0) return
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()

    const startX = e.clientX
    const startY = e.clientY
    const start = offset
    const baseTop = panelRef.current ? panelRef.current.getBoundingClientRect().top - start.y : 0

    const onMove = (ev: PointerEvent) => {
      const y = start.y + (ev.clientY - startY)
      setOffset({ x: start.x + (ev.clientX - startX), y: Math.max(y, MIN_TOP_PX - baseTop) })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return { panelRef, offset, onPointerDown }
}
