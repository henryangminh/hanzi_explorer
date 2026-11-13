import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

/** Stops touch events so swiping inside the modal doesn't move the dashboard's mobile carousel. */
const stopTouch = {
  onTouchStart: (e: React.TouchEvent) => e.stopPropagation(),
  onTouchMove: (e: React.TouchEvent) => e.stopPropagation(),
  onTouchEnd: (e: React.TouchEvent) => e.stopPropagation(),
}

export function SettingsModalShell({ onClose, footer, children }: {
  onClose: () => void
  footer: React.ReactNode
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} {...stopTouch} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl shadow-xl w-full max-w-lg pointer-events-auto max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
          {...stopTouch}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] flex-shrink-0">
            <h2 className="font-semibold text-[var(--color-text)]">{t('dashboard.widgetSettings')}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">{children}</div>
          <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--color-border)] flex-shrink-0">
            {footer}
          </div>
        </div>
      </div>
    </>
  )
}
