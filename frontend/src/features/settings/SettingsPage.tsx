import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { KeyRound } from 'lucide-react'
import { useSettingsStore } from '@/store/settings.store'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

function OptionButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer',
        active
          ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] border-[var(--color-primary)]'
          : 'border-[var(--color-border-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]'
      )}
    >
      {children}
    </button>
  )
}

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { theme, language, setTheme, setLanguage, syncToServer } = useSettingsStore()
  const navigate = useNavigate()

  const handleTheme = (t: 'light' | 'dark') => {
    setTheme(t)
    syncToServer()
  }

  const handleLanguage = (l: 'vi' | 'en') => {
    setLanguage(l)
    i18n.changeLanguage(l)
    syncToServer()
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold text-[var(--color-text)] mb-6">
        {t('settings.title')}
      </h1>

      <div className="flex flex-col gap-4">
        {/* Theme */}
        <Card>
          <p className="text-sm font-medium text-[var(--color-text)] mb-3">
            {t('settings.theme')}
          </p>
          <div className="flex gap-2">
            <OptionButton active={theme === 'light'} onClick={() => handleTheme('light')}>
              ☀ {t('settings.light')}
            </OptionButton>
            <OptionButton active={theme === 'dark'} onClick={() => handleTheme('dark')}>
              ☽ {t('settings.dark')}
            </OptionButton>
          </div>
        </Card>

        {/* Language */}
        <Card>
          <p className="text-sm font-medium text-[var(--color-text)] mb-3">
            {t('settings.language')}
          </p>
          <div className="flex gap-2">
            <OptionButton active={language === 'vi'} onClick={() => handleLanguage('vi')}>
              🇻🇳 Tiếng Việt
            </OptionButton>
            <OptionButton active={language === 'en'} onClick={() => handleLanguage('en')}>
              🇬🇧 English
            </OptionButton>
          </div>
        </Card>

        {/* Password */}
        <Card>
          <p className="text-sm font-medium text-[var(--color-text)] mb-3">
            {t('settings.security')}
          </p>
          <Button
            variant="outline"
            onClick={() => navigate('/settings/change-password')}
            className="flex items-center gap-2 w-fit"
          >
            <KeyRound size={15} />
            {t('settings.changePassword')}
          </Button>
        </Card>
      </div>
    </div>
  )
}
