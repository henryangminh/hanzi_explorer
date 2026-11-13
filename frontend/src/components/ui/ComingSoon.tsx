import { useTranslation } from 'react-i18next'

/** Placeholder for an admin page that is not built yet. */
export function ComingSoon({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  return <div>{t(titleKey)} — {t('common.comingSoon')}</div>
}
