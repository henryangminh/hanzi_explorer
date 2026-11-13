import { useTranslation } from 'react-i18next'
import { FIELD_INPUT, FieldLabel } from './FieldLabel'

export const MAX_WIDGET_NAME = 25

export function NameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  return (
    <>
      <FieldLabel>{t('dashboard.widgetName')}</FieldLabel>
      <input
        type="text"
        maxLength={MAX_WIDGET_NAME}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 ${FIELD_INPUT}`}
      />
      <p className="text-[11px] text-[var(--color-text-muted)] mt-1 text-right">{value.length}/{MAX_WIDGET_NAME}</p>
    </>
  )
}
