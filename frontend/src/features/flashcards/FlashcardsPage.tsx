import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import api from '@/lib/axios'
import { useFlashcardStore } from '@/store/flashcard.store'
import { Flashcard } from '@/components/ui/Flashcard'
import { Pagination } from '@/components/ui/Pagination'
import type { FlashcardEntry } from '@/types'

const DEFAULT_PAGE_SIZE = 10

type Tab = 'learned' | 'unlearned'

export function FlashcardsPage() {
  const { t } = useTranslation()
  const { widgets, updateCardStatus } = useFlashcardStore()

  const [cards, setCards] = useState<FlashcardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('learned')

  const [learnedPage, setLearnedPage] = useState(1)
  const [learnedPageSize, setLearnedPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [unlearnedPage, setUnlearnedPage] = useState(1)
  const [unlearnedPageSize, setUnlearnedPageSize] = useState(DEFAULT_PAGE_SIZE)

  const fetchMarked = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<FlashcardEntry[]>('/notebooks/flashcards/marked')
      setCards(data)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMarked() }, [fetchMarked])

  async function handleStatusChange(char: string, status: 'learned' | 'not_learned' | null) {
    try {
      await api.put('/notebooks/flashcards/status', { char, status })
    } catch { /* silent */ }

    if (status === null) {
      setCards((prev) => prev.filter((c) => c.char !== char))
    } else {
      setCards((prev) => prev.map((c) => c.char === char ? { ...c, status } : c))
    }

    for (const widget of widgets) {
      if (widget.cards.some((c) => c.char === char)) {
        updateCardStatus(widget.id, char, status)
      }
    }
  }

  const learned = cards.filter((c) => c.status === 'learned')
  const unlearned = cards.filter((c) => c.status === 'not_learned')

  const learnedSlice = learned.slice(
    (learnedPage - 1) * learnedPageSize,
    learnedPage * learnedPageSize,
  )
  const unlearnedSlice = unlearned.slice(
    (unlearnedPage - 1) * unlearnedPageSize,
    unlearnedPage * unlearnedPageSize,
  )

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'learned', label: t('flashcards.learned'), count: learned.length },
    { key: 'unlearned', label: t('flashcards.unlearned'), count: unlearned.length },
  ]

  return (
    <div className="py-6 px-4">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          {t('flashcards.title')}
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" />
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <p className="text-sm">{t('flashcards.empty')}</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex border-b border-[var(--color-border)] mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.key
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
                )}
              >
                {tab.label}
                <span className={cn(
                  'ml-2 text-xs px-1.5 py-0.5 rounded-full',
                  activeTab === tab.key
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                    : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]',
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'learned' && (
            learned.length === 0 ? (
              <div className="text-center py-20 text-[var(--color-text-muted)]">
                <p className="text-sm">{t('flashcards.empty')}</p>
              </div>
            ) : (
              <section>
                <div className="flex justify-end mb-3">
                  <Pagination
                    page={learnedPage}
                    pageSize={learnedPageSize}
                    total={learned.length}
                    onPageChange={setLearnedPage}
                    onPageSizeChange={setLearnedPageSize}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {learnedSlice.map((card) => (
                    <Flashcard
                      key={card.char}
                      card={card}
                      compact
                      onStatusChange={(status) => handleStatusChange(card.char, status)}
                    />
                  ))}
                </div>
                <Pagination
                  page={learnedPage}
                  pageSize={learnedPageSize}
                  total={learned.length}
                  onPageChange={setLearnedPage}
                  onPageSizeChange={setLearnedPageSize}
                  className="justify-center mt-4"
                />
              </section>
            )
          )}

          {activeTab === 'unlearned' && (
            unlearned.length === 0 ? (
              <div className="text-center py-20 text-[var(--color-text-muted)]">
                <p className="text-sm">{t('flashcards.empty')}</p>
              </div>
            ) : (
              <section>
                <div className="flex justify-end mb-3">
                  <Pagination
                    page={unlearnedPage}
                    pageSize={unlearnedPageSize}
                    total={unlearned.length}
                    onPageChange={setUnlearnedPage}
                    onPageSizeChange={setUnlearnedPageSize}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {unlearnedSlice.map((card) => (
                    <Flashcard
                      key={card.char}
                      card={card}
                      compact
                      onStatusChange={(status) => handleStatusChange(card.char, status)}
                    />
                  ))}
                </div>
                <Pagination
                  page={unlearnedPage}
                  pageSize={unlearnedPageSize}
                  total={unlearned.length}
                  onPageChange={setUnlearnedPage}
                  onPageSizeChange={setUnlearnedPageSize}
                  className="justify-center mt-4"
                />
              </section>
            )
          )}
        </>
      )}
    </div>
  )
}
