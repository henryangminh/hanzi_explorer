import { NoteFields } from '@/features/notes/NoteFields'
import { DeleteNoteButton, EditNoteButton, NoteFormButtons } from '@/features/notes/NoteActions'
import { NoteText } from '@/features/notes/NoteText'
import type { UserNoteResponse } from '@/types'
import type { NoteEditor } from '../hooks/useNoteEditor'

/** The note (or its edit form). */
export function NoteEditorContent({ note, editor, id, detailRows }: {
  note: UserNoteResponse
  editor: NoteEditor
  id: string
  detailRows: number
}) {
  return editor.editing
    ? <NoteFields id={id} draft={editor.draft} detailRows={detailRows} detailTone="subtle" gapClass="gap-1" />
    : <NoteText note={note} relaxed />
}

/** Edit / delete — or cancel / save while editing. */
export function NoteEditorFooter({ editor }: { editor: NoteEditor }) {
  return editor.editing ? (
    <NoteFormButtons saving={editor.saving} canSave={editor.draft.isValid} onCancel={editor.cancelEdit} onSave={editor.save} />
  ) : (
    <>
      <EditNoteButton onClick={editor.startEdit} />
      <DeleteNoteButton deleting={editor.deleting} onClick={editor.remove} />
    </>
  )
}
