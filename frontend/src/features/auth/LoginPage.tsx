import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth.store'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const user = await login(username, password)
      if (user.is_admin) {
        navigate('/admin/dashboard', { replace: true })
      } else {
        navigate('/radicals', { replace: true })
      }
    } catch {
      setError(t('auth.loginError'))
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="font-cjk text-5xl text-[var(--color-primary)]">漢</span>
          <h1 className="mt-3 text-xl font-semibold text-[var(--color-text)]">
            Hanzi Explorer
          </h1>
        </div>

        {/* Card */}
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="username"
              label={t('auth.username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
            <Input
              id="password"
              label={t('auth.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              className="mt-1 w-full"
            >
              {isLoading ? t('auth.loggingIn') : t('auth.loginButton')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
