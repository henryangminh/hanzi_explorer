import { useTranslation } from 'react-i18next'
import { Expand, Settings } from 'lucide-react'

const ICON_BUTTON = 'p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors'

export function WidgetHeader({ name, onExpand, onOpenSettings }: {
  name: string
  onExpand: () => void
  onOpenSettings: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between min-w-0 px-2.5">
      <h3 className="text-sm font-semibold text-[var(--color-text)] truncate">{name}</h3>
      <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
        <button type="button" onClick={onExpand} title={t('dashboard.expandWidget')} className={ICON_BUTTON}>
          <Expand size={13} />
        </button>
        <button type="button" onClick={onOpenSettings} title={t('dashboard.widgetSettings')} className={ICON_BUTTON}>
          <Settings size={13} />
        </button>
      </div>
    </div>
  )
}
