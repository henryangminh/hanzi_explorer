import type SignaturePad from 'signature_pad'

const ENDPOINT = 'https://inputtools.google.com/request?itc=zh-t-i0-handwrit&app=demopage'
const SINGLE_HANZI = /^[一-鿿㐀-䶿]$/
const MAX_CANDIDATES = 10
/** Shown when recognition fails, so the user always has something to pick. */
const FALLBACK_CANDIDATES = ['一', '二', '三', '十', '口', '人', '木', '水', '日', '月']

/** Google Input Tools expects each stroke as [xs, ys, times]. */
function toInk(strokes: ReturnType<SignaturePad['toData']>): number[][][] {
  return strokes.map((stroke) => [
    stroke.points.map((p) => p.x),
    stroke.points.map((p) => p.y),
    stroke.points.map((p) => p.time),
  ])
}

/** Single Chinese characters recognized from the drawn strokes (never empty). */
export async function recognizeHandwriting(
  strokes: ReturnType<SignaturePad['toData']>,
  width: number,
  height: number,
): Promise<string[]> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_version: 0.4,
        api_level: '537.36',
        device: window.navigator.userAgent,
        input_type: '0',
        options: 'enable_pre_space',
        requests: [{ writing_guide: { writing_area_width: width, writing_area_height: height }, ink: toInk(strokes), language: 'zh' }],
      }),
    })
    const json = await res.json()
    const results = json[0] === 'SUCCESS' && json[1]?.[0]?.[1]
      ? (json[1][0][1] as string[]).filter((c) => c.length === 1 && SINGLE_HANZI.test(c))
      : []
    return (results.length > 0 ? results : FALLBACK_CANDIDATES).slice(0, MAX_CANDIDATES)
  } catch {
    return FALLBACK_CANDIDATES
  }
}
