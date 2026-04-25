import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import SignaturePad from 'signature_pad'
import { RotateCcw, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import api from '@/lib/axios'
import { cn } from '@/lib/cn'

interface Props {
  onInsertChar: (char: string) => void
  onClose: () => void
}



export function HandwritingPad({ onInsertChar, onClose }: Props) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)
  const [candidates, setCandidates] = useState<string[]>([])
  const [recognizing, setRecognizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    if (window.innerWidth < 640) return
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('button')) return

    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const startOffset = offset

    let baseTop = 0
    if (panelRef.current) {
      baseTop = panelRef.current.getBoundingClientRect().top - startOffset.y
    }

    const onMove = (moveEvent: PointerEvent) => {
      let newX = startOffset.x + (moveEvent.clientX - startX)
      let newY = startOffset.y + (moveEvent.clientY - startY)

      if (baseTop + newY < 60) {
        newY = 60 - baseTop
      }

      setOffset({ x: newX, y: newY })
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const recognizeRef = useRef<(() => void) | undefined>(undefined)

  const recognize = useCallback(async () => {
    const canvas = canvasRef.current
    const pad = padRef.current
    if (!canvas || !pad || pad.isEmpty()) return

    setRecognizing(true)
    setError(null)
    try {
      const data = pad.toData()
      if (data.length === 0) return

      // Format stroke data for Google Input Tools API
      const trace_data = data.map(stroke => {
        const xParams: number[] = []
        const yParams: number[] = []
        const timeParams: number[] = []
        for (const pt of stroke.points) {
          xParams.push(pt.x)
          yParams.push(pt.y)
          timeParams.push(pt.time)
        }
        return [xParams, yParams, timeParams]
      })

      const payload = {
        app_version: 0.4,
        api_level: "537.36",
        device: window.navigator.userAgent,
        input_type: "0",
        options: "enable_pre_space",
        requests: [
          {
            writing_guide: { writing_area_width: canvas.width, writing_area_height: canvas.height },
            ink: trace_data,
            language: "zh"
          }
        ]
      }

      const res = await fetch("https://inputtools.google.com/request?itc=zh-t-i0-handwrit&app=demopage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      let results: string[] = []
      if (json[0] === 'SUCCESS' && json[1] && json[1][0] && json[1][0][1]) {
        // Filter: only 1 character & must be a Chinese character
        results = (json[1][0][1] as string[]).filter(
          (char) => char.length === 1 && /^[\u4e00-\u9fff\u3400-\u4dbf]$/.test(char)
        )
      }
      
      if (results.length === 0) {
        // Fallback characters if Google API returns empty
        results = ["一", "二", "三", "十", "口", "人", "木", "水", "日", "月"]
      }

      setCandidates(results.slice(0, 10))
    } catch {
      // Never show "Không nhận diện được", just fallback
      setCandidates(["一", "二", "三", "十", "口", "人", "木", "水", "日", "月"])
    } finally {
      setRecognizing(false)
    }
  }, [])

  recognizeRef.current = recognize

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Account for device pixel ratio so strokes are sharp and pixel-dense
    // (especially on Retina/HiDPI screens where DPR = 2)
    const dpr = Math.max(window.devicePixelRatio || 1, 1)
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
    const ctx2d = canvas.getContext('2d')!
    ctx2d.scale(dpr, dpr)

    const pad = new SignaturePad(canvas, {
      backgroundColor: 'rgba(0,0,0,0)',
      penColor: '#111111',
      // Uniform stroke width — same min/max removes velocity-based thick/thin
      minWidth: 2.5,
      maxWidth: 2.5,
    })
    padRef.current = pad

    const onEndStroke = () => {
      setIsEmpty(false)
      recognizeRef.current?.()
    }
    pad.addEventListener('endStroke', onEndStroke)

    return () => {
      pad.removeEventListener('endStroke', onEndStroke)
      pad.off()
    }
  }, [])

  function handleUndo() {
    const pad = padRef.current
    if (!pad) return
    const data = pad.toData()
    if (data.length === 0) return
    data.pop()
    pad.fromData(data)
    if (data.length === 0) {
      setIsEmpty(true)
      setCandidates([])
      setError(null)
    } else {
      recognizeRef.current?.()
    }
  }

  function handleClear() {
    padRef.current?.clear()
    setIsEmpty(true)
    setCandidates([])
    setError(null)
  }

  return (
    // Floating panel — no backdrop overlay so the search bar stays interactive
    <div 
      ref={panelRef}
      className={cn(
        "bg-[var(--color-bg-surface)] shadow-xl flex flex-col gap-3 transition-shadow",
        "w-full rounded-t-2xl p-5", // mobile
        "sm:w-72 sm:rounded-2xl sm:border sm:border-[var(--color-border)] sm:p-3" // desktop
      )}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between cursor-move select-none"
        onPointerDown={handlePointerDown}
      >
        <span className="text-sm font-semibold text-[var(--color-text)] pointer-events-none">
          {t('handwriting.title')}
        </span>
        <button
          onClick={onClose}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Drawing canvas */}
      <div
        className="relative w-full aspect-square rounded-xl overflow-hidden border border-[var(--color-border)] bg-white"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-crosshair"
          style={{ display: 'block' }}
        />
        {isEmpty && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-gray-300 pointer-events-none select-none">
            {t('handwriting.hint')}
          </p>
        )}
      </div>

      {/* Undo / Clear */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleUndo} disabled={isEmpty} className="flex-1 justify-center" title={t('handwriting.undo')}>
          <RotateCcw size={13} />
          {t('handwriting.undo')}
        </Button>
        <Button variant="outline" size="sm" onClick={handleClear} disabled={isEmpty} className="flex-1 justify-center">
          <Trash2 size={13} />
          {t('handwriting.clear')}
        </Button>
      </div>

      {/* Candidate characters — tap to insert at cursor */}
      <div className="min-h-[44px] flex items-center gap-1 flex-wrap">
        {recognizing && (
          <span className="text-xs text-[var(--color-text-muted)] animate-pulse w-full">
            {t('handwriting.recognizing')}
          </span>
        )}
        {!recognizing && error && (
          <span className="text-xs text-red-400">{error}</span>
        )}
        {!recognizing && candidates.length > 0 && candidates.map((char) => (
          <button
            key={char}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              onInsertChar(char)
              handleClear()
            }}
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
