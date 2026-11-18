import { useTranslation } from 'react-i18next'
import { useSaveFlashcardStatus } from '@/hooks/useSaveFlashcardStatus'
import { useReaderStore } from '@/store/reader.store'
import type { FlashcardStatus } from '@/types'
import { ReaderInput } from './components/ReaderInput'
import { ReaderToolbar } from './components/ReaderToolbar'
import { ReadingText } from './components/ReadingText'
import { WordPanel } from './components/WordPanel'
import { useAnalyseText } from './hooks/useAnalyseText'

/** Reading assistant: paste a text, read it with pinyin over each word, click a word for its meaning. */
export function ReaderPage() {
  const { t } = useTranslation()
  const { text, tokens, selected, showPinyin, setText, setTokens, setSelected, toggleShowPinyin, setWordStatus } = useReaderStore()
  const { analyse, loading, error } = useAnalyseText()
  const saveStatus = useSaveFlashcardStatus()

  const selectedToken = selected !== null ? tokens?.[selected] : undefined
  const selectedWord = selectedToken?.word ? { ...selectedToken, word: selectedToken.word } : null

  function handleStatusChange(word: string, status: FlashcardStatus | null) {
    setWordStatus(word, status)
    saveStatus(word, status)
  }

  return (
    <div className="flex gap-6 items-start">
      <div className="flex flex-col gap-4 flex-1 min-w-0">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">{t('reader.title')}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">{t('reader.subtitle')}</p>
        </div>

        {tokens === null ? (
          <ReaderInput text={text} onTextChange={setText} onSubmit={() => analyse(text)} loading={loading} error={error} />
        ) : (
          <>
            <ReaderToolbar showPinyin={showPinyin} onTogglePinyin={toggleShowPinyin} onEdit={() => setTokens(null)} />
            <ReadingText tokens={tokens} showPinyin={showPinyin} selected={selected} onSelect={(i) => setSelected(selected === i ? null : i)} />
            {/* Room for the bottom sheet on small screens, so the last lines stay reachable */}
            {selectedWord && <div className="h-[55vh] lg:hidden" />}
          </>
        )}
      </div>

      {selectedWord && (
        <WordPanel
          token={selectedWord}
          onStatusChange={(status) => handleStatusChange(selectedWord.word, status)}
          onClose={() => setSelected(null)}
          className="fixed inset-x-0 bottom-0 z-30 h-[55vh] rounded-b-none shadow-lg lg:shadow-none lg:rounded-b-xl lg:sticky lg:top-20 lg:inset-auto lg:z-auto lg:w-96 lg:shrink-0 lg:h-[calc(100vh-6rem)]"
        />
      )}
    </div>
  )
}
