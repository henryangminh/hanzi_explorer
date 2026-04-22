import { useTranslation } from 'react-i18next'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/cn'

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
]

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  className?: string
}

function getPageNumbers(current: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)

  if (current <= 4) return [1, 2, 3, 4, 5, '...', totalPages]
  if (current >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }
  return [1, '...', current - 1, current, current + 1, '...', totalPages]
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const { t } = useTranslation()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageNumbers = getPageNumbers(page, totalPages)

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {/* Page size selector */}
      <div className="flex items-center gap-1">
        <Select
          value={String(pageSize)}
          options={PAGE_SIZE_OPTIONS}
          onChange={(v) => { onPageSizeChange(Number(v)); onPageChange(1) }}
          align="right"
        />
        <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">{t('pagination.perPage')}</span>
      </div>

      {/* Divider */}
      <span className="text-[var(--color-border-md)] select-none">|</span>

      {/* Page buttons */}
      <div className="flex items-center gap-0.5">
        {pageNumbers.map((p, i) =>
          p === '...' ? (
            <span
              key={`ellipsis-${i}`}
              className="px-1.5 text-xs text-[var(--color-text-muted)] select-none"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                'min-w-[28px] h-7 px-1.5 rounded text-xs transition-colors cursor-pointer',
                p === page
                  ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)]',
              )}
            >
              {p}
            </button>
          )
        )}
      </div>
    </div>
  )
}
