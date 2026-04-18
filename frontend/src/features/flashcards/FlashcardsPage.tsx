import { useTranslation } from 'react-i18next'
import { useFlashcardStore } from '@/store/flashcard.store'
import { Flashcard } from '@/components/ui/Flashcard'
import type { FlashcardEntry } from '@/types'

export function FlashcardsPage() {
  const { t } = useTranslation()
  const { widgets, updateCardStatus } = useFlashcardStore()

  // Deduplicate cards by char across all widgets, tracking which widgets contain each char
  const cardMap = new Map<string, { card: FlashcardEntry; widgetIds: string[] }>()
  for (const widget of widgets) {
    for (const card of widget.cards) {
      const existing = cardMap.get(card.char)
      if (existing) {
        existing.widgetIds.push(widget.id)
        // Prioritize: learned > not_learned > null
        if (existing.card.status !== 'learned' && card.status === 'learned') {
          existing.card = { ...card }
        } else if (existing.card.status === null && card.status === 'not_learned') {
          existing.card = { ...card }
        }
      } else {
        cardMap.set(card.char, { card: { ...card }, widgetIds: [widget.id] })
      }
    }
  }

  const allCards = Array.from(cardMap.values())
  const learned = allCards.filter(({ card }) => card.status === 'learned')
  const unlearned = allCards.filter(({ card }) => card.status === 'not_learned')

  function handleStatusChange(char: string, widgetIds: string[], status: 'learned' | 'not_learned' | null) {
    for (const widgetId of widgetIds) {
      updateCardStatus(widgetId, char, status)
    }
  }

  return (
    <div className="py-6 px-4">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          {t('flashcards.title')}
        </h1>
      </div>

      {allCards.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <p className="text-sm">{t('flashcards.empty')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {learned.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
                {t('flashcards.learned')} ({learned.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {learned.map(({ card, widgetIds }) => (
                  <Flashcard
                    key={card.char}
                    card={card}
                    compact
                    onStatusChange={(status) => handleStatusChange(card.char, widgetIds, status)}
                  />
                ))}
              </div>
            </section>
          )}

          {unlearned.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
                {t('flashcards.unlearned')} ({unlearned.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {unlearned.map(({ card, widgetIds }) => (
                  <Flashcard
                    key={card.char}
                    card={card}
                    compact
                    onStatusChange={(status) => handleStatusChange(card.char, widgetIds, status)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
