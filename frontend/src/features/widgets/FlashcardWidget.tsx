import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { useCardCarousel } from '@/hooks/useCardCarousel'
import { useSaveFlashcardStatus } from '@/hooks/useSaveFlashcardStatus'
import { useFlashcardStore, type FlashcardWidgetConfig } from '@/store/flashcard.store'
import type { FlashcardStatus, NotebookResponse } from '@/types'
import { FlashcardLarge } from '@/features/flashcards/components/FlashcardLarge'
import { WotdDatePicker } from '@/features/flashcards/components/WotdDatePicker'
import { CardStack } from './components/CardStack'
import { ReviewButton } from './components/ReviewButton'
import { WidgetHeader } from './components/WidgetHeader'
import { FlashcardWidgetSettings, type WidgetSettingsValues } from './FlashcardWidgetSettings'
import { useDayChange } from './hooks/useDayChange'
import { useRefreshCountdown } from './hooks/useRefreshCountdown'
import { useReview } from './hooks/useReview'
import { useStudyDays } from './hooks/useStudyDays'
import { useWidgetCards } from './hooks/useWidgetCards'
import { useWotdHistory } from './hooks/useWotdHistory'
import { countStreak, longestStreak } from './streak'

interface Props {
  widget: FlashcardWidgetConfig
  allNotebooks: NotebookResponse[]
}

/** Dashboard widget: a carousel of flashcards refreshed on a schedule (or daily, for words of the day). */
export function FlashcardWidget({ widget, allNotebooks }: Props) {
  const { t } = useTranslation()
  const { updateWidget, removeWidget } = useFlashcardStore()
  const saveStatus = useSaveFlashcardStatus()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [largeOpen, setLargeOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  const isWotd = widget.isDefault
  const cardsLoader = useWidgetCards(widget.id)
  const history = useWotdHistory(isWotd, () => carousel.reset())
  const cards = history.viewDate !== null && history.historyCards !== null ? history.historyCards : widget.cards
  const carousel = useCardCarousel(cards.length)
  const loading = cardsLoader.loading || history.loading
  const studyDays = useStudyDays(isWotd)
  const review = useReview(isWotd, studyDays.markToday)

  function handleStatusChange(char: string, status: FlashcardStatus | null) {
    const saved = saveStatus(char, status)
    if (!isWotd) return
    if (status) studyDays.markToday()
    saved.then(review.refresh)  // marking a due word ✓ takes it out of today's review
  }

  async function loadTodaysWords() {
    if (await cardsLoader.ensureTodaysWords()) {
      carousel.setIndex(0)
      history.refreshDates()
    }
  }

  async function refreshCustom(notebookIds: number[], count: number) {
    if (await cardsLoader.refreshCustom(notebookIds, count)) carousel.setIndex(0)
  }

  useEffect(() => {
    if (isWotd) loadTodaysWords()
    // Mount only: later refreshes come from the day change / countdown below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useDayChange(isWotd, () => { loadTodaysWords(); history.refreshDates() })
  const countdown = useRefreshCountdown(widget, (w) => refreshCustom(w.notebookIds, w.count))

  function handleSaveSettings(values: WidgetSettingsValues) {
    if (isWotd) {
      updateWidget(widget.id, values)
    } else {
      // Drop the old cards so marked cards from previous notebooks don't bleed into the new config
      updateWidget(widget.id, { ...values, lastRefreshed: null, cards: [] })
      refreshCustom(values.notebookIds, values.count)
    }
    setSettingsOpen(false)
  }

  const emptyMessage = isWotd && history.viewDate !== null
    ? t('dashboard.noWOTD')
    : widget.notebookIds.length === 0 ? t('dashboard.noSource') : t('dashboard.noCards')

  return (
    <>
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl px-1 py-4 flex flex-col gap-3">
        <WidgetHeader name={widget.name} streak={isWotd ? { days: countStreak(studyDays.dates), best: longestStreak(studyDays.dates) } : undefined} onExpand={() => setLargeOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />

        {loading ? (
          <div className="flex items-center justify-center h-[240px]">
            <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex items-center justify-center h-[240px] text-sm text-[var(--color-text-muted)] italic text-center px-4">
            {emptyMessage}
          </div>
        ) : (
          <>
            <CardStack cards={cards} carousel={carousel} onStatusChange={handleStatusChange} />
            <p className="text-center text-xs text-[var(--color-text-muted)]">
              {carousel.safeIndex + 1}/{cards.length}
            </p>
          </>
        )}

        {!loading && !isWotd && (
          <div className="border-t border-[var(--color-border)] pt-2">
            {/* Same row height as the words-of-the-day footer (review button), so widgets line up */}
            <p className="min-h-7 flex items-center justify-center text-xs text-[var(--color-text-muted)]">
              {countdown ? t('dashboard.refreshIn', { time: countdown }) : ''}
            </p>
          </div>
        )}

        {!loading && isWotd && (
          <div className="border-t border-[var(--color-border)] pt-2 flex flex-col gap-0">
            <WotdDatePicker
              leading={review.cards.length > 0 && <ReviewButton count={review.cards.length} onClick={() => setReviewOpen(true)} />}
              wotdDates={history.dates}
              studiedDates={studyDays.dates}
              viewDate={history.viewDate}
              onSelectDate={history.selectDate}
              onBackToToday={history.backToToday}
            />
          </div>
        )}
      </div>

      {settingsOpen && (
        <FlashcardWidgetSettings
          widget={widget}
          allNotebooks={allNotebooks}
          onSave={handleSaveSettings}
          onDelete={isWotd ? undefined : () => { removeWidget(widget.id); setSettingsOpen(false) }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {largeOpen && (
        <FlashcardLarge
          cards={cards}
          initialIndex={carousel.safeIndex}
          onClose={() => setLargeOpen(false)}
          onStatusChange={handleStatusChange}
          wotd={isWotd ? {
            wotdDates: history.dates,
            studiedDates: studyDays.dates,
            viewDate: history.viewDate,
            onSelectDate: history.selectDate,
            onBackToToday: history.backToToday,
          } : undefined}
        />
      )}

      {reviewOpen && (
        <FlashcardLarge
          cards={review.cards}
          onClose={() => { setReviewOpen(false); review.refresh() }}
          onStatusChange={review.answer}
        />
      )}
    </>
  )
}
