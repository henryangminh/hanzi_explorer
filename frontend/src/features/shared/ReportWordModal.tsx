import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { wordReportsApi } from '@/api/wordReportsApi'
import { Button } from '@/components/ui/Button'
import { ModalOverlay } from '@/components/ui/ModalOverlay'

interface ReportWordModalProps {
  char: string
  onClose: () => void
}

/** Tell the admins what is wrong or missing in a word's dictionary entry. */
export function ReportWordModal({ char, onClose }: ReportWordModalProps) {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [failed, setFailed] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    setFailed(false)
    try {
      await wordReportsApi.create(char, message.trim())
      setSent(true)
    } catch {
      setFailed(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-md mx-4 bg-[var(--color-bg-surface)] rounded-2xl shadow-xl p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text)]">{t('report.title')}</h2>
            <p className="text-sm text-[var(--color-text-muted)] font-cjk mt-0.5">{char}</p>
          </div>
          <button
            title={t('common.close')}
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {sent ? (
          <>
            <p className="text-sm text-[var(--color-text)]">{t('report.thanks')}</p>
            <div className="flex justify-end">
              <Button size="sm" onClick={onClose}>{t('common.close')}</Button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <textarea
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder={t('report.placeholder')}
              className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] resize-y focus:outline-none focus:border-[var(--color-primary)]"
            />
            {failed && <p className="text-xs text-red-500">{t('report.error')}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
              <Button type="submit" size="sm" isLoading={sending} disabled={!message.trim()}>{t('report.send')}</Button>
            </div>
          </form>
        )}
      </div>
    </ModalOverlay>
  )
}
