import { ColorizedHanzi } from '@/lib/pinyinColor'

/** "简 (簡)" — colorized by tone when a reading is known. Traditional forms with ⁑ are CEDICT artifacts. */
export function CharHeading({ char, traditional, pinyin }: { char: string; traditional: string | null; pinyin: string | null }) {
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      {pinyin
        ? <ColorizedHanzi char={char} pinyin={pinyin} className="font-cjk text-3xl leading-none" />
        : <span className="font-cjk text-3xl text-[var(--color-text)] leading-none">{char}</span>}
      {traditional && traditional !== char && !traditional.includes('⁑') && (
        <span className="font-cjk text-3xl text-[var(--color-text-muted)] leading-none">
          ({pinyin ? <ColorizedHanzi char={traditional} pinyin={pinyin} /> : traditional})
        </span>
      )}
    </div>
  )
}
