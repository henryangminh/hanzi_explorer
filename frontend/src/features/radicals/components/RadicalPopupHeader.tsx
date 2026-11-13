import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import type { RadicalSummary } from '@/types'

export function RadicalPopupHeader({ radical, onClose }: { radical: RadicalSummary; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {radical.radical.split(',').map((form) => (
            <div key={form} className="w-14 h-14 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] flex items-center justify-center">
              <span className="font-cjk text-4xl text-[var(--color-primary)]">{form}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="font-semibold text-lg text-[var(--color-text)]">{radical.pinyin}</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {radical.meaning_en && <span className="mr-1">{radical.meaning_en}</span>}
            {radical.meaning_vi && <span>· {radical.meaning_vi}</span>}
          </p>
          {radical.stroke_count && (
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t('radicals.strokes', { count: radical.stroke_count })}</p>
          )}
        </div>
      </div>
      <button onClick={onClose} title={t('common.close')} className="p-2 rounded-lg hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] transition-colors">
        <X size={18} />
      </button>
    </div>
  )
}
