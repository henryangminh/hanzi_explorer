import type { ExternalSource } from '@/types'
import { CollapsibleSection } from './CollapsibleSection'

interface WiktionaryData {
  found?: boolean
  sections?: { part_of_speech: string; definitions: string[] }[]
}

/** Definitions numbered 1. 2. …; lines starting with "→" are examples of the previous one. */
function Definitions({ definitions }: { definitions: string[] }) {
  let number = 0
  return (
    <div className="mt-1 flex flex-col gap-1">
      {definitions.map((def, i) => {
        if (def.startsWith('→')) {
          return <div key={i} className="ml-4 text-sm italic" style={{ color: 'var(--color-accent)' }}>{def}</div>
        }
        number++
        return (
          <div key={i} className="flex gap-1.5 text-sm text-[var(--color-text)]">
            <span className="shrink-0 text-[var(--color-text-muted)]">{number}.</span>
            <span>{def}</span>
          </div>
        )
      })}
    </div>
  )
}

/** One Wiktionary source (EN or VI); nothing when the page wasn't found. */
export function WiktionarySection({ source }: { source: ExternalSource }) {
  const data = source.data as WiktionaryData
  if (!data.found) return null
  return (
    <CollapsibleSection title={source.label}>
      <div className="pl-4 flex flex-col gap-2">
        {data.sections?.map((sec, i) => (
          <div key={i}>
            {sec.part_of_speech && (
              <span className="inline-block text-sm font-medium text-[var(--color-primary)] border border-[var(--color-primary)] rounded px-1.5 py-0.5 mb-1">
                {sec.part_of_speech}
              </span>
            )}
            <Definitions definitions={sec.definitions} />
          </div>
        ))}
      </div>
    </CollapsibleSection>
  )
}
