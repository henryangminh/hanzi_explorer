import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Bookmark } from 'lucide-react'
import { ColorizedHanzi, ColorizedPinyin } from '@/lib/pinyinColor'
import { useGoToDictionary } from '@/hooks/useGoToDictionary'
import { CharDetailPanel } from '@/features/char-detail/CharDetailPanel'
import { SaveToNotebookModal } from '@/features/shared/SaveToNotebookModal'

/** One character from the radical's list, in detail. */
export function RadicalCharDetail({ char, onBack }: { char: string; onBack: () => void }) {
  const { t } = useTranslation()
  const goToDictionary = useGoToDictionary()
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [header, setHeader] = useState<{ pinyin: string; sinoVn: string[] } | null>(null)

  return (
    <div className="flex flex-col h-full">
      {saveModalOpen && <SaveToNotebookModal char={char} onClose={() => setSaveModalOpen(false)} />}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] shrink-0">
        <button onClick={onBack} title={t('common.back')} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0 flex items-baseline gap-x-2.5 flex-wrap">
          {header?.pinyin
            ? <ColorizedHanzi char={char} pinyin={header.pinyin} className="font-cjk text-4xl leading-none" />
            : <span className="font-cjk text-4xl text-[var(--color-primary)] leading-none">{char}</span>}
          {header && (
            <span className="text-sm text-[var(--color-text-muted)]">
              <ColorizedPinyin pinyin={header.pinyin} n={[...char].length} />
              {header.sinoVn.length > 0 && <span className="ml-1.5 text-[var(--color-primary)]">· {header.sinoVn.join(', ')}</span>}
            </span>
          )}
        </div>
        <button
          onClick={() => setSaveModalOpen(true)}
          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors shrink-0"
          title={t('notebooks.saveToNotebook')}
        >
          <Bookmark size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <CharDetailPanel
          char={char}
          showNotes
          onDataLoaded={(entry) => setHeader({ pinyin: entry.cedict[0]?.pinyin ?? '', sinoVn: entry.sino_vn ?? [] })}
          onWordClick={goToDictionary}
        />
      </div>
    </div>
  )
}
