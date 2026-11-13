import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CollapsibleSection } from '../components/CollapsibleSection'
import { NoteDetailPanel, PANEL_BELOW_GRID } from './NoteDetailPanel'
import { NoteFormPanel } from './NoteFormPanel'
import { NoteTile } from './NoteTile'
import type { CharNotes } from './useCharNotes'

/** What is open under the grid: one note, its edit form, or the add form. */
type OpenPanel = { kind: 'view' | 'edit'; noteId: number } | { kind: 'add' } | null

/** "My notes" on a word: grid of notes; selecting one opens it below the grid. */
export function NotesSection({ char, notes }: { char: string; notes: CharNotes }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<OpenPanel>(null)
  const openNoteId = open && open.kind !== 'add' ? open.noteId : null

  return (
    <CollapsibleSection title={t('dictionary.notes')}>
      <div className="flex flex-col gap-2">
        {notes.notes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {notes.notes.map((note) => (
              <Fragment key={note.id}>
                <NoteTile
                  note={note}
                  selected={open?.kind === 'view' && openNoteId === note.id}
                  onClick={() => setOpen(open?.kind === 'view' && openNoteId === note.id ? null : { kind: 'view', noteId: note.id })}
                />
                {openNoteId === note.id && open?.kind === 'view' && (
                  <NoteDetailPanel
                    note={note}
                    onEdit={() => setOpen({ kind: 'edit', noteId: note.id })}
                    onDelete={async () => { await notes.remove(note.id); setOpen(null) }}
                  />
                )}
                {openNoteId === note.id && open?.kind === 'edit' && (
                  <NoteFormPanel
                    id={`edit-title-${note.id}`}
                    className={PANEL_BELOW_GRID}
                    initialTitle={note.title}
                    initialDetail={note.detail ?? ''}
                    onSave={async (input) => { await notes.update(note.id, input); setOpen({ kind: 'view', noteId: note.id }) }}
                    onCancel={() => setOpen({ kind: 'view', noteId: note.id })}
                  />
                )}
              </Fragment>
            ))}
          </div>
        )}

        {open?.kind === 'add' ? (
          <NoteFormPanel
            id={`new-title-${char}`}
            className="flex flex-col gap-2 p-3 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg-subtle)]"
            onSave={async (input) => { await notes.add(input); setOpen(null) }}
            onCancel={() => setOpen(null)}
          />
        ) : (
          <Button size="sm" variant="outline" className="self-start flex items-center gap-1.5" onClick={() => setOpen({ kind: 'add' })}>
            <Plus size={13} />
            {t('dictionary.addNote')}
          </Button>
        )}
      </div>
    </CollapsibleSection>
  )
}
