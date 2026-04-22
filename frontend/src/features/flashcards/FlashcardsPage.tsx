import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import api from '@/lib/axios'
import { useFlashcardStore } from '@/store/flashcard.store'
import { Flashcard } from '@/components/ui/Flashcard'
import { Pagination } from '@/components/ui/Pagination'
import type { FlashcardEntry } from '@/types'

const DEFAULT_PAGE_SIZE = 10

export function FlashcardsPage() {
  const { t } = useTranslation()
  const { widgets, updateCardStatus } = useFlashcardStore()

  const [cards, setCards] = useState<FlashcardEntry[]>([])
  const [loading, setLoading] = useState(true)

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
        <div className="flex flex-col gap-8">
          {learned.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-[var(--color-text-muted)]">
                  {t('flashcards.learned')} ({learned.length})
                </h2>
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
          )}

          {learned.length > 0 && unlearned.length > 0 && (
            <hr className="border-[var(--color-border)]" />
          )}

          {unlearned.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-[var(--color-text-muted)]">
                  {t('flashcards.unlearned')} ({unlearned.length})
                </h2>
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
          )}
        </div>
      )}
    </div>
  )
}
