import { useState } from 'react'
import type { NoteInput } from '@/api/notesApi'
import { NoteFormButtons } from '@/features/notes/NoteActions'
import { NoteFields } from '@/features/notes/NoteFields'
import { useNoteDraft } from '@/features/notes/useNoteDraft'

interface NoteFormPanelProps {
  id: string
  className: string
  initialTitle?: string
  initialDetail?: string
  onSave: (input: NoteInput) => Promise<void>
  onCancel: () => void
}

/** Add-or-edit note form. */
export function NoteFormPanel({ id, className, initialTitle, initialDetail, onSave, onCancel }: NoteFormPanelProps) {
  const draft = useNoteDraft(initialTitle, initialDetail)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!draft.isValid) return
    setSaving(true)
    try {
      await onSave(draft.toInput())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={className}>
      <NoteFields id={id} draft={draft} />
      <div className="flex gap-2 justify-end">
        <NoteFormButtons saving={saving} canSave={draft.isValid} onCancel={onCancel} onSave={handleSave} />
      </div>
    </div>
  )
}
