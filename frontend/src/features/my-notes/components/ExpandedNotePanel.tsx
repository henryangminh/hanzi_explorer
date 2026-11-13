import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import type { UserNoteResponse } from '@/types'
import { useNoteEditor } from '../hooks/useNoteEditor'
import { CloseButton } from './CloseButton'
import { NoteEditorContent, NoteEditorFooter } from './NoteEditorBody'
import { NoteReading, NoteWord } from './NoteReading'

interface NotePanelProps {
  note: UserNoteResponse
  onClose: () => void
  onUpdated: (updated: UserNoteResponse) => void
  onDeleted: (id: number) => void
  onGoToDict: (char: string) => void
}

/** Desktop: the note in a square panel over the page. */
export function ExpandedNotePanel({ note, onClose, onUpdated, onDeleted, onGoToDict }: NotePanelProps) {
  const { t } = useTranslation()
  const editor = useNoteEditor(note, onUpdated, onDeleted)

  return (
    <div className="hidden sm:flex fixed top-14 inset-x-0 bottom-0 z-[39] items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
      <div
        className={cn(
          'relative z-10 flex flex-col rounded-2xl shadow-xl',
          'bg-[var(--color-bg-surface)] border border-[var(--color-border)]',
          'w-full max-w-[420px]',
          editor.editing ? 'min-h-[420px]' : 'aspect-square', // the edit form needs more height
        )}
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <CloseButton onClick={onClose} className="absolute top-3 right-3 z-10" />

        <div className="px-5 pt-5 pb-3 border-b border-[var(--color-border)]">
          <button
            onClick={() => onGoToDict(note.char)}
            className="font-cjk text-3xl font-bold hover:opacity-75 transition-opacity leading-none block cursor-pointer"
            title={t('myNotes.goToDictionary')}
          >
            <NoteWord note={note} />
          </button>
          <NoteReading note={note} className="mt-1.5" pinyinClass="text-sm font-medium" sinoVnClass="text-sm" />
        </div>

        <div className="flex-1 flex flex-col px-5 py-4 gap-3 overflow-y-auto">
          <NoteEditorContent note={note} editor={editor} id="expand-edit-title" detailRows={4} />
        </div>

        <div className="px-5 pb-5 pt-2 flex gap-2 justify-between border-t border-[var(--color-border)]">
          <NoteEditorFooter editor={editor} />
        </div>
      </div>
    </div>
  )
}

/** Mobile: the note right below its card. */
export function InlineNoteDetail({ note, onClose, onUpdated, onDeleted, onGoToDict }: NotePanelProps) {
  const { t } = useTranslation()
  const editor = useNoteEditor(note, onUpdated, onDeleted)

  return (
    <div className="col-span-full rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-bg-surface)] shadow-sm flex flex-col gap-0 overflow-hidden">
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-[var(--color-border)]">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onGoToDict(note.char)}
            className="font-cjk text-2xl font-bold text-[var(--color-primary)] hover:opacity-75 transition-opacity leading-none text-left"
            title={t('myNotes.goToDictionary')}
          >
            {note.char}
          </button>
          {note.pinyin && <span className="text-sm font-medium text-[var(--color-text)]">{note.pinyin}</span>}
          {note.sino_vn?.length > 0 && <span className="text-sm text-[var(--color-text-muted)]">{note.sino_vn.join(', ')}</span>}
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <div className="px-4 py-3 flex flex-col gap-2">
        <NoteEditorContent note={note} editor={editor} id="inline-edit-title" detailRows={3} />
      </div>

      <div className="px-4 pb-4 pt-2 flex gap-2 justify-between border-t border-[var(--color-border)]">
        <NoteEditorFooter editor={editor} />
      </div>
    </div>
  )
}
