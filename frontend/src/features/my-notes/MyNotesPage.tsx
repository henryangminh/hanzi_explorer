import { Fragment, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useGoToDictionary } from '@/hooks/useGoToDictionary'
import { useUIStore } from '@/store/ui.store'
import type { UserNoteResponse } from '@/types'
import { LoadingLine } from '@/components/ui/LoadingLine'
import { EmptyNotes } from './components/EmptyNotes'
import { ExpandedNotePanel, InlineNoteDetail } from './components/ExpandedNotePanel'
import { NoteCard } from './components/NoteCard'
import { useMyNotes } from './hooks/useMyNotes'

export function MyNotesPage() {
  const { t } = useTranslation()
  const goToDictionary = useGoToDictionary()
  const { notes, loading, replace, remove } = useMyNotes()
  const { expandedNote, setExpandedNote } = useUIStore()

  const toggleNote = useCallback((note: UserNoteResponse) => {
    setExpandedNote(expandedNote?.id === note.id ? null : note)
  }, [expandedNote, setExpandedNote])

  if (loading) return <LoadingLine text={t('common.loading')} iconSize={16} className="justify-center py-16" />

  const panelProps = expandedNote && {
    note: expandedNote,
    onClose: () => setExpandedNote(null),
    onUpdated: (updated: UserNoteResponse) => { replace(updated); setExpandedNote(updated) },
    onDeleted: (id: number) => { remove(id); setExpandedNote(null) },
    onGoToDict: goToDictionary,
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      <h1 className="text-xl font-bold text-[var(--color-text)]">{t('myNotes.title')}</h1>

      {notes.length === 0 ? <EmptyNotes /> : (
        <div className="flex flex-col gap-2.5 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {notes.map((note) => (
            <Fragment key={note.id}>
              <NoteCard note={note} onToggle={toggleNote} />
              {panelProps && expandedNote?.id === note.id && (
                <div className="sm:hidden">
                  <InlineNoteDetail {...panelProps} />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      )}

      {panelProps && <ExpandedNotePanel {...panelProps} />}
    </div>
  )
}
