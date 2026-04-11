import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import api from '@/lib/axios'

export function ChangePasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError(t('settings.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('settings.passwordMismatch'))
      return
    }

    setSaving(true)
    try {
      await api.patch('/users/profile', {
        new_password: newPassword,
      })
      setSaved(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => navigate('/settings'), 1500)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail
      setError(msg ?? t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md">
      {/* Back button */}
      <button
        onClick={() => navigate('/settings')}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors mb-5"
      >
        <ArrowLeft size={15} />
        {t('common.back')}
      </button>

      <h1 className="text-xl font-semibold text-[var(--color-text)] mb-6">
        {t('settings.changePassword')}
      </h1>

      <Card>
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[var(--color-border)]">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-subtle)] flex items-center justify-center text-[var(--color-primary)]">
            <KeyRound size={18} />
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            {t('settings.changePasswordHint')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="newPassword"
            label={t('settings.newPassword')}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            autoFocus
          />
          <Input
            id="confirmPassword"
            label={t('settings.confirmPassword')}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}
          {saved && (
            <p className="text-sm text-green-500">{t('settings.passwordChanged')}</p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/settings')}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={saving} disabled={!newPassword || !confirmPassword}>
              {t('settings.changePassword')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
