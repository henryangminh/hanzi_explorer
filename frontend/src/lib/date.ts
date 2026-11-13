/** Local calendar date as YYYY-MM-DD (the format the WOTD API uses). */
export function toLocalDateStr(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** YYYY-MM-DD → DD/MM/YYYY */
export function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

/** hh:mm:ss for a duration in milliseconds (rounded up to the second). */
export function formatCountdown(ms: number): string {
  const totalSecs = Math.ceil(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}
