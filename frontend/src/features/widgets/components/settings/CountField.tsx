import { useTranslation } from 'react-i18next'
import { FIELD_INPUT, FieldLabel, NO_SPINNER } from './FieldLabel'

export function CountField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { t } = useTranslation()
  return (
    <>
      <FieldLabel>{t('dashboard.count')}</FieldLabel>
      <input
        type="number"
        min={1}
        max={100}
        value={value}
        onChange={(e) => onChange(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
        className={`w-full px-2 py-2 ${FIELD_INPUT} ${NO_SPINNER} text-center`}
      />
    </>
  )
}
