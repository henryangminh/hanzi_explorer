import { useTranslation } from 'react-i18next'

/** [label key, alignment classes] */
export type DataColumn = [string, string]

/** A plain read-only table; numbers should be right-aligned by their column. */
export function DataTable({ columns, rows }: { columns: DataColumn[]; rows: React.ReactNode[][] }) {
  const { t } = useTranslation()
  return (
    <div className="bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-border)] overflow-x-auto">
      <table className="w-full text-sm whitespace-nowrap">
        <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
          <tr>{columns.map(([key, align]) => <th key={key} className={`px-4 py-3 font-medium ${align}`}>{t(key)}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text)]">
          {rows.map((cells, i) => (
            <tr key={i}>
              {cells.map((cell, j) => <td key={j} className={`px-4 py-3 ${columns[j][1]}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
