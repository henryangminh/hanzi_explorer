import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Loader2, StickyNote, X, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/lib/axios'
import type { UserNoteResponse } from '@/types'
import { useDictionaryStore } from '@/store/dictionary.store'

// ── Expanded note panel (square, fixed overlay) ────────────

function ExpandedNotePanel({
  note,
  onClose,
  onUpdated,
  onDeleted,
  onGoToDict,
}: {
  note: UserNoteResponse
  onClose: () => void
  onUpdated: (updated: UserNoteResponse) => void
  onDeleted: (id: number) => void
  onGoToDict: (char: string) => void
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(note.title)
  const [editDetail, setEditDetail] = useState(note.detail ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    if (!editTitle.trim()) return
    setSaving(true)
    try {
      const { data } = await api.put<UserNoteResponse>(
        `/dictionary/${encodeURIComponent(note.char)}/notes/${note.id}`,
        { title: editTitle.trim(), detail: editDetail.trim() || null }
      )
      onUpdated(data)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/dictionary/${encodeURIComponent(note.char)}/notes/${note.id}`)
      onDeleted(note.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />

      {/* Square panel */}
      <div
        className={cn(
          'relative z-10 flex flex-col rounded-2xl shadow-xl',
          'bg-[var(--color-bg-surface)] border border-[var(--color-border)]',
          'w-full max-w-[420px]',
          // Keep aspect-square unless editing (longer content)
          editing ? 'min-h-[420px]' : 'aspect-square'
        )}
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors z-10"
        >
          <X size={15} />
        </button>

        {/* Header: char + pinyin + hán việt */}
        <div className="px-5 pt-5 pb-3 border-b border-[var(--color-border)]">
          <button
            onClick={() => onGoToDict(note.char)}
            className="font-cjk text-3xl font-bold text-[var(--color-primary)] hover:opacity-75 transition-opacity leading-none block cursor-pointer"
            title={t('myNotes.goToDictionary')}
          >
            {note.char}
          </button>
          <div className="mt-1.5 flex flex-col gap-0.5">
            {note.pinyin && (
              <span className="text-sm font-medium text-[var(--color-text)]">{note.pinyin}</span>
            )}
            {note.sino_vn?.length > 0 && (
              <span className="text-sm text-[var(--color-text-muted)]">{note.sino_vn.join(', ')}</span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col px-5 py-4 gap-3 overflow-y-auto">
          {editing ? (
            <>
              <div className="flex flex-col gap-1">
                <Input
                  id="expand-edit-title"
                  label={t('dictionary.noteTitle')}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value.slice(0, 50))}
                  placeholder={t('dictionary.noteTitlePlaceholder')}
                  autoFocus
                  maxLength={50}
                />
                <span className="text-xs text-[var(--color-text-muted)] text-right">
                  {t('dictionary.charCount', { current: editTitle.length, max: 50 })}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  {t('dictionary.noteDetail')}
                </label>
                <textarea
                  value={editDetail}
                  onChange={(e) => setEditDetail(e.target.value.slice(0, 250))}
                  placeholder={t('dictionary.noteDetailPlaceholder')}
                  rows={4}
                  maxLength={250}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-sm resize-none',
                    'bg-[var(--color-bg-subtle)] text-[var(--color-text)]',
                    'border border-[var(--color-border)] focus:border-[var(--color-primary)]',
                    'outline-none transition-colors placeholder:text-[var(--color-text-muted)]'
                  )}
                />
                <span className="text-xs text-[var(--color-text-muted)] text-right">
                  {t('dictionary.charCount', { current: editDetail.length, max: 250 })}
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-[var(--color-text)] break-words leading-snug">
                {note.title}
              </p>
              {note.detail && (
                <p className="text-sm text-[var(--color-text-muted)] break-words whitespace-pre-wrap leading-relaxed">
                  {note.detail}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer: action buttons */}
        <div className="px-5 pb-5 pt-2 flex gap-2 justify-between border-t border-[var(--color-border)]">
          {editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditTitle(note.title); setEditDetail(note.detail ?? '') }}>
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                isLoading={saving}
                disabled={!editTitle.trim()}
              >
                {saving ? t('dictionary.saving') : t('dictionary.save')}
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-1.5"
                onClick={() => setEditing(true)}
              >
                <Pencil size={12} />
                {t('dictionary.editNote')}
              </Button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                title={t('dictionary.deleteNote')}
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Small note card ────────────────────────────────────────

function NoteCard({
  note,
  onClick,
}: {
  note: UserNoteResponse
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex flex-col text-left gap-1.5 p-3 rounded-xl border',
        'bg-[var(--color-bg-subtle)] border-[var(--color-border)]',
        'hover:border-[var(--color-primary)] hover:shadow-sm transition-all',
        'aspect-square overflow-hidden'
      )}
    >
      {/* Character + pinyin + hán việt: char bên trái, pinyin/HV xếp dọc bên phải */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-cjk text-xl font-bold leading-none text-[var(--color-primary)] shrink-0 group-hover:scale-105 transition-transform origin-left">
          {note.char}
        </span>
        {(note.pinyin || note.sino_vn?.length > 0) && (
          <div className="flex flex-col gap-0.5 min-w-0 overflow-hidden">
            {note.pinyin && (
              <span className="text-[10px] font-medium text-[var(--color-text)] leading-none truncate">
                {note.pinyin}
              </span>
            )}
            {note.sino_vn?.length > 0 && (
              <span className="text-[10px] text-[var(--color-text-muted)] leading-none truncate">
                {note.sino_vn.join(', ')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-[var(--color-border)] my-0.5 shrink-0" />

      {/* Title */}
      <p className="text-xs font-semibold text-[var(--color-text)] line-clamp-2 break-words min-w-0 leading-snug">
        {note.title}
      </p>

      {/* Detail */}
      {note.detail && (
        <p className="text-[10px] text-[var(--color-text-muted)] line-clamp-3 break-words min-w-0 leading-snug">
          {note.detail}
        </p>
      )}
    </button>
  )
}

// ── Main page ──────────────────────────────────────────────

export function MyNotesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { query: dictQuery, results: dictResults } = useDictionaryStore()

  const [notes, setNotes] = useState<UserNoteResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedNote, setExpandedNote] = useState<UserNoteResponse | null>(null)

  useEffect(() => {
    api
      .get<UserNoteResponse[]>('/dictionary/notes')
      .then(({ data }) => setNotes(data))
      .finally(() => setLoading(false))
  }, [])

  const handleGoToDict = (char: string) => {
    setExpandedNote(null)
    // If dictionary already has this char as the current query, just navigate
    // without re-searching (store state will restore results)
    if (dictQuery === char && dictResults.length > 0) {
      navigate('/dictionary')
    } else {
      navigate(`/dictionary?q=${encodeURIComponent(char)}`)
    }
  }

  const handleNoteUpdated = (updated: UserNoteResponse) => {
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
    setExpandedNote(updated)
  }

  const handleNoteDeleted = (id: number) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    setExpandedNote(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--color-text-muted)]">
        <Loader2 size={16} className="animate-spin" />
        <span>{t('common.loading')}</span>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      <h1 className="text-xl font-bold text-[var(--color-text)]">{t('myNotes.title')}</h1>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-[var(--color-text-muted)]">
          <StickyNote size={36} strokeWidth={1.4} />
          <p className="text-sm">{t('myNotes.empty')}</p>
          <p className="text-xs">{t('myNotes.emptyHint')}</p>
          <button
            onClick={() => navigate('/dictionary')}
            className="mt-2 text-sm text-[var(--color-primary)] hover:underline"
          >
            → {t('myNotes.goToDictionary')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onClick={() => setExpandedNote(note)}
            />
          ))}
        </div>
      )}

      {expandedNote && (
        <ExpandedNotePanel
          note={expandedNote}
          onClose={() => setExpandedNote(null)}
          onUpdated={handleNoteUpdated}
          onDeleted={handleNoteDeleted}
          onGoToDict={handleGoToDict}
        />
      )}
    </div>
  )
}
