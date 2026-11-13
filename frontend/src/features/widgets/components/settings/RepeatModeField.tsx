import { useTranslation } from 'react-i18next'
import type { RepeatMode } from '@/store/flashcard.store'
import { FieldLabel } from './FieldLabel'

const REPEAT_MODES: { value: RepeatMode; labelKey: string; hintKey: string }[] = [
  { value: 'random',           labelKey: 'dashboard.repeatRandom',          hintKey: 'dashboard.repeatRandomHint' },
  { value: 'repeat_unlearned', labelKey: 'dashboard.repeatRepeatUnlearned', hintKey: 'dashboard.repeatRepeatUnlearnedHint' },
  { value: 'unlearned_only',   labelKey: 'dashboard.repeatUnlearned',       hintKey: 'dashboard.repeatUnlearnedHint' },
  { value: 'no_repeat',        labelKey: 'dashboard.repeatNone',            hintKey: 'dashboard.repeatNoneHint' },
]

export function RepeatModeField({ value, onChange }: { value: RepeatMode; onChange: (v: RepeatMode) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col">
      <FieldLabel>{t('dashboard.repeatMode')}</FieldLabel>
      <div className="grid grid-cols-2 sm:flex sm:flex-col gap-1.5 sm:gap-1">
        {REPEAT_MODES.map(({ value: mode, labelKey, hintKey }) => (
          <label
            key={mode}
            className="flex items-start sm:items-center gap-2 px-2.5 py-2 rounded-lg border border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-bg-subtle)]"
            style={value === mode ? { borderColor: 'var(--color-primary)', background: 'var(--color-bg-subtle)' } : {}}
          >
            <input
              type="radio"
              name="repeatMode"
              value={mode}
              checked={value === mode}
              onChange={() => onChange(mode)}
              className="accent-[var(--color-primary)] flex-shrink-0 mt-0.5 sm:mt-0"
            />
            <div className="min-w-0">
              <span className="text-xs text-[var(--color-text)] font-medium block truncate sm:overflow-visible sm:whitespace-normal">{t(labelKey)}</span>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-tight line-clamp-2 sm:line-clamp-none">{t(hintKey)}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
