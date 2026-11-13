import { cn } from '@/lib/cn'
import { ColorizedHanzi, ColorizedPinyin } from '@/lib/pinyinColor'
import type { UserNoteResponse } from '@/types'

/** The noted word, colorized by tone when its reading is known. */
export function NoteWord({ note }: { note: UserNoteResponse }) {
  return note.pinyin
    ? <ColorizedHanzi char={note.char} pinyin={note.pinyin} />
    : <span className="text-[var(--color-primary)]">{note.char}</span>
}

/** Pinyin and Hán Việt of the noted word, stacked. */
export function NoteReading({ note, pinyinClass, sinoVnClass, className }: {
  note: UserNoteResponse
  pinyinClass: string
  sinoVnClass: string
  className?: string
}) {
  if (!note.pinyin && !note.sino_vn?.length) return null
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      {note.pinyin && <ColorizedPinyin pinyin={note.pinyin} n={[...note.char].length} className={pinyinClass} />}
      {note.sino_vn?.length > 0 && <span className={cn('text-[var(--color-text-muted)]', sinoVnClass)}>{note.sino_vn.join(', ')}</span>}
    </div>
  )
}
