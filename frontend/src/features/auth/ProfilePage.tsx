import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth.store'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getErrorDetail } from '@/lib/axios'
import { usersApi } from '@/api/usersApi'

export function ProfilePage() {
  const { t } = useTranslation()
  const { user, fetchMe } = useAuthStore()

  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await usersApi.updateProfile(displayName.trim())
      await fetchMe()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: unknown) {
      setError(getErrorDetail(err) ?? t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold text-[var(--color-text)] mb-6">
        {t('profile.title')}
      </h1>

      <Card>
        {/* Avatar */}
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[var(--color-border)]">
          <div className="w-12 h-12 rounded-full bg-[var(--color-bg-subtle)] flex items-center justify-center text-[var(--color-primary)] text-lg font-bold">
            {user?.display_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-[var(--color-text)]">{user?.display_name}</p>
            <p className="text-sm text-[var(--color-text-muted)]">@{user?.username}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Input
            id="displayName"
            label={t('profile.displayName')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={100}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" isLoading={saving} disabled={!displayName.trim()}>
            {saved ? t('profile.saved') : t('profile.save')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
