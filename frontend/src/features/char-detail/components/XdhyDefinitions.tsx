import { cn } from '@/lib/cn'
import type { XdhyDefItem } from '@/types'

const SUB_LABEL = /^([a-z])\s*[）)]\s*(.*)/

/**
 * One part-of-speech group of 现代汉语词典 definitions. Numbered items are 1. 2. …; lettered
 * sub-items (a） b） …) are indented under their parent — unless the group has no parent item.
 */
export function XdhyDefinitions({ defs }: { defs: XdhyDefItem[] }) {
  const hasParent = defs.some((d) => !d.is_sub)
  let number = 0
  return (
    <div className="flex flex-col gap-1 pl-6">
      {defs.map((d, i) => {
        const isSub = d.is_sub && hasParent
        const subMatch = isSub ? d.definition.match(SUB_LABEL) : null
        const text = subMatch ? subMatch[2].trim() : d.definition.replace(/^[a-z]\s*[）)]\s*/, '').trim()
        if (!isSub) number++
        const label = isSub ? (subMatch?.[1] ? `${subMatch[1]}）` : '•') : `${number}.`
        return (
          <div key={i} className={isSub ? 'ml-4' : ''}>
            <div className="flex gap-1.5 text-sm text-[var(--color-text)]">
              <span className="shrink-0 text-[var(--color-text-muted)]">{label}</span>
              <span className="text-lg font-cjk">{text}</span>
            </div>
            {d.examples.map((ex, j) => (
              <div key={j} className={cn('text-lg italic font-cjk', isSub ? 'ml-8' : 'ml-4')} style={{ color: 'var(--color-accent)' }}>
                → {ex}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
