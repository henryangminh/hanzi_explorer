import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pagination } from '@/components/ui/Pagination'
import type { FlashcardEntry, FlashcardStatus } from '@/types'
import { Flashcard } from './Flashcard'

const DEFAULT_PAGE_SIZE = 10

interface PaginatedCardGridProps {
  cards: FlashcardEntry[]
  onExpand: (card: FlashcardEntry) => void
  onStatusChange: (char: string, status: FlashcardStatus | null) => void
}

/** Compact flashcards in a grid with pagination above and below. */
export function PaginatedCardGrid({ cards, onExpand, onStatusChange }: PaginatedCardGridProps) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  if (cards.length === 0) {
    return (
      <div className="text-center py-20 text-[var(--color-text-muted)]">
        <p className="text-sm">{t('flashcards.empty')}</p>
      </div>
    )
  }

  const pagination = { page, pageSize, total: cards.length, onPageChange: setPage, onPageSizeChange: setPageSize }
  return (
    <section>
      <div className="flex justify-end mb-3">
        <Pagination {...pagination} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {cards.slice((page - 1) * pageSize, page * pageSize).map((card) => (
          <Flashcard
            key={card.char}
            card={card}
            compact
            onExpand={() => onExpand(card)}
            onStatusChange={(status) => onStatusChange(card.char, status)}
          />
        ))}
      </div>
      <Pagination {...pagination} className="justify-center mt-4" />
    </section>
  )
}
