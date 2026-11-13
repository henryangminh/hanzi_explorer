import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Minus, Plus } from 'lucide-react'
import { DictionarySectionTitle } from '@/components/ui/Card'

/** A dictionary section with a title and a +/− toggle that hides its content. */
export function CollapsibleSection({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <DictionarySectionTitle>{title}</DictionarySectionTitle>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          title={collapsed ? t('common.expand') : t('common.collapse')}
        >
          {collapsed ? <Plus size={14} /> : <Minus size={14} />}
        </button>
      </div>
      {!collapsed && children}
    </div>
  )
}
