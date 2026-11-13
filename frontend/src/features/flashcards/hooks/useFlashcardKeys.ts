import { useEffect, useRef } from 'react'

interface FlashcardKeyHandlers {
  onPrev: () => void
  onNext: () => void
  onLearned: () => void
  onNotLearned: () => void
  onToggleReveal: () => void
  onClose: () => void
}

/** ← → navigate, ↑ learned, ↓ not learned, Space reveal, Esc close (ignored while typing). */
export function useFlashcardKeys(handlers: FlashcardKeyHandlers) {
  const latest = useRef(handlers)
  useEffect(() => { latest.current = handlers })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const h = latest.current
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); h.onPrev(); break
        case 'ArrowRight': e.preventDefault(); h.onNext(); break
        case 'ArrowUp':    e.preventDefault(); h.onLearned(); break
        case 'ArrowDown':  e.preventDefault(); h.onNotLearned(); break
        case ' ':          e.preventDefault(); h.onToggleReveal(); break
        case 'Escape':     h.onClose(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
