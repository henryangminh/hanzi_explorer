import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { notebooksApi } from '@/api/notebooksApi'
import { Button } from '@/components/ui/Button'
import type { AddEntriesResult } from '@/types'

/** Words may be separated by spaces, commas (also Chinese ，、), semicolons or new lines. */
const SEPARATORS = /[\s,，、;；]+/

interface AddEntriesFormProps {
  notebookId: number
  onAdded: () => void
}

/** Paste a list of words to add them all to a notebook; says which were skipped and why. */
export function AddEntriesForm({ notebookId, onAdded }: AddEntriesFormProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [adding, setAdding] = useState(false)
  const [result, setResult] = useState<AddEntriesResult | null>(null)
  const words = text.split(SEPARATORS).filter(Boolean)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (words.length === 0) return
    setAdding(true)
    try {
      const res = await notebooksApi.addEntries(notebookId, words)
      setResult(res)
      setText(res.unknown.join(' '))
      if (res.added.length > 0) onAdded()
    } finally {
      setAdding(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 pt-3 shrink-0 flex flex-col gap-2">
      <div className="flex gap-2 items-start">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder={t('notebooks.addEntriesPlaceholder')}
          className="flex-1 px-3 py-2 text-sm font-cjk rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] resize-y focus:outline-none focus:border-[var(--color-primary)]"
        />
        <Button type="submit" size="sm" isLoading={adding} disabled={words.length === 0}>
          {t('notebooks.addEntries', { count: words.length })}
        </Button>
      </div>
      {result && (
        <p className="text-xs text-[var(--color-text-muted)] flex flex-wrap gap-x-3">
          <span style={{ color: '#0d9363' }}>{t('notebooks.addedCount', { count: result.added.length })}</span>
          {result.existing.length > 0 && <span>{t('notebooks.existingCount', { count: result.existing.length })}</span>}
          {result.unknown.length > 0 && (
            <span className="text-red-500 dark:text-red-400">{t('notebooks.unknownWords', { words: result.unknown.join(', ') })}</span>
          )}
        </p>
      )}
    </form>
  )
}
