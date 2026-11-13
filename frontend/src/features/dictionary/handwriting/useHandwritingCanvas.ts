import { useEffect, useRef, useState } from 'react'
import SignaturePad from 'signature_pad'
import { recognizeHandwriting } from '@/api/handwritingApi'

/** A drawing canvas that re-recognizes the character after every stroke. */
export function useHandwritingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)
  const [candidates, setCandidates] = useState<string[]>([])
  const [recognizing, setRecognizing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)

  async function recognize() {
    const canvas = canvasRef.current
    const pad = padRef.current
    if (!canvas || !pad || pad.isEmpty()) return
    setRecognizing(true)
    try {
      setCandidates(await recognizeHandwriting(pad.toData(), canvas.width, canvas.height))
    } finally {
      setRecognizing(false)
    }
  }
  const recognizeRef = useRef(recognize)
  useEffect(() => { recognizeRef.current = recognize })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Scale for the device pixel ratio so strokes stay sharp on HiDPI screens
    const dpr = Math.max(window.devicePixelRatio || 1, 1)
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
    canvas.getContext('2d')!.scale(dpr, dpr)

    // Same min/max width: uniform strokes, no velocity-based thick/thin
    const pad = new SignaturePad(canvas, { backgroundColor: 'rgba(0,0,0,0)', penColor: '#111111', minWidth: 2.5, maxWidth: 2.5 })
    padRef.current = pad
    const onEndStroke = () => {
      setIsEmpty(false)
      recognizeRef.current()
    }
    pad.addEventListener('endStroke', onEndStroke)
    return () => {
      pad.removeEventListener('endStroke', onEndStroke)
      pad.off()
    }
  }, [])

  function clear() {
    padRef.current?.clear()
    setIsEmpty(true)
    setCandidates([])
  }

  function undo() {
    const pad = padRef.current
    const strokes = pad?.toData() ?? []
    if (!pad || strokes.length === 0) return
    strokes.pop()
    pad.fromData(strokes)
    if (strokes.length === 0) clear()
    else recognizeRef.current()
  }

  return { canvasRef, candidates, recognizing, isEmpty, clear, undo }
}
