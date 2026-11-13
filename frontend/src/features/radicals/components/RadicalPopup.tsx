import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { ModalOverlay } from '@/components/ui/ModalOverlay'
import { useUIStore } from '@/store/ui.store'
import type { RadicalSummary } from '@/types'
import { useRadicalChars } from '../hooks/useRadicalChars'
import { RadicalCharDetail } from './RadicalCharDetail'
import { RadicalCharGrid } from './RadicalCharGrid'
import { RadicalPopupHeader } from './RadicalPopupHeader'

/** Modal: the characters of a radical, or one of them in detail. */
export function RadicalPopup({ radical, onClose }: { radical: RadicalSummary; onClose: () => void }) {
  const { t } = useTranslation()
  const { loading, chars } = useRadicalChars(radical.radical)
  const { selectedRadicalChar, setSelectedRadicalChar } = useUIStore()

  return (
    <ModalOverlay onClose={onClose} className="items-end sm:items-center p-0 sm:p-4 bg-black/50">
      <div className={cn(
        'w-full sm:max-w-2xl bg-[var(--color-bg-surface)] flex flex-col overflow-hidden',
        'rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)]',
        'h-full sm:max-h-[90vh]',
      )}>
        {selectedRadicalChar ? (
          <RadicalCharDetail char={selectedRadicalChar} onBack={() => setSelectedRadicalChar(null)} />
        ) : (
          <div className="flex flex-col h-full">
            <RadicalPopupHeader radical={radical} onClose={onClose} />
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <p className="text-sm text-[var(--color-text-muted)]">{t('common.loading')}</p>
              ) : chars.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] italic">{t('common.noData')}</p>
              ) : (
                <RadicalCharGrid chars={chars} onSelect={setSelectedRadicalChar} />
              )}
            </div>
          </div>
        )}
      </div>
    </ModalOverlay>
  )
}
