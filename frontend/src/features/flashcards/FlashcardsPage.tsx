import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import type { FlashcardEntry } from '@/types'
import { FlashcardLarge } from './components/FlashcardLarge'
import { PaginatedCardGrid } from './components/PaginatedCardGrid'
import { StatusTabs } from './components/StatusTabs'
import { useMarkedFlashcards } from './hooks/useMarkedFlashcards'

type Tab = 'learned' | 'unlearned'

export function FlashcardsPage() {
  const { t } = useTranslation()
  const { loading, total, learned, notLearned, setStatus } = useMarkedFlashcards()
  const [activeTab, setActiveTab] = useState<Tab>('learned')
  const [large, setLarge] = useState<{ cards: FlashcardEntry[]; index: number } | null>(null)

  const activeCards = activeTab === 'learned' ? learned : notLearned
  const openLarge = (card: FlashcardEntry) => setLarge({
    cards: activeCards,
    index: Math.max(0, activeCards.findIndex((c) => c.char === card.char)),
  })

  return (
    <div className="py-6 px-4">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{t('flashcards.title')}</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" />
        </div>
      ) : total === 0 ? (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <p className="text-sm">{t('flashcards.empty')}</p>
        </div>
      ) : (
        <>
          <StatusTabs
            tabs={[
              { key: 'learned', label: t('flashcards.learned'), count: learned.length },
              { key: 'unlearned', label: t('flashcards.unlearned'), count: notLearned.length },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />
          {/* Both grids stay mounted so each tab keeps its own page */}
          <div className={activeTab === 'learned' ? undefined : 'hidden'}>
            <PaginatedCardGrid cards={learned} onExpand={openLarge} onStatusChange={setStatus} />
          </div>
          <div className={activeTab === 'unlearned' ? undefined : 'hidden'}>
            <PaginatedCardGrid cards={notLearned} onExpand={openLarge} onStatusChange={setStatus} />
          </div>
        </>
      )}

      {large && (
        <FlashcardLarge
          cards={large.cards}
          initialIndex={large.index}
          onClose={() => setLarge(null)}
          onStatusChange={setStatus}
        />
      )}
    </div>
  )
}
