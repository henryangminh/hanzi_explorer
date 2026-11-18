import { useTranslation } from 'react-i18next'
import { formatDateTime } from '@/lib/date'
import { CrawlStatusCard } from './components/CrawlStatusCard'
import { DataTable, type DataColumn } from './components/DataTable'
import { useDataSources } from './hooks/useDataSources'

const NUMBER = 'text-right tabular-nums'
const MUTED = 'text-[var(--color-text-muted)]'

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{title}</h2>
        {hint && <p className="text-xs text-[var(--color-text-muted)] mt-1">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/** Where the dictionary data comes from and how complete it is (read only). */
export function DataPage() {
  const { t } = useTranslation()
  const { data, error } = useDataSources()

  const definitionColumns: DataColumn[] = [
    ['admin.data.colSource', 'text-left'],
    ['admin.data.colOrigin', `text-left ${MUTED}`],
    ['admin.data.colEntries', NUMBER],
    ['admin.data.colImported', 'text-left'],
  ]
  const datasetColumns: DataColumn[] = [
    ['admin.data.colData', 'text-left'],
    ['admin.data.colOrigin', `text-left ${MUTED}`],
    ['admin.data.colRows', NUMBER],
  ]
  const onlineColumns: DataColumn[] = [
    ['admin.data.colSource', 'text-left'],
    ['admin.data.colCached', NUMBER],
    ['admin.data.colLastCached', 'text-left'],
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">{t('admin.layout.data')}</h1>
        {data && (
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {t('admin.data.subtitle', { count: data.total_words.toLocaleString(), date: formatDateTime(data.dictionary_built_at) })}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{t('admin.data.loadError')}</p>}
      {!data && !error && <p className="text-sm text-[var(--color-text-muted)]">{t('common.loading')}</p>}

      {data && (
        <>
          <Section title={t('admin.data.definitionsTitle')} hint={t('admin.data.definitionsHint')}>
            <DataTable
              columns={definitionColumns}
              rows={data.definition_sources.map((s) => [
                <span className="font-medium">{s.name}</span>,
                s.origin ?? '—',
                s.entry_count.toLocaleString(),
                s.imported_at ? formatDateTime(s.imported_at) : '—',
              ])}
            />
          </Section>

          <Section title={t('admin.data.datasetsTitle')}>
            <DataTable
              columns={datasetColumns}
              rows={data.datasets.map((d) => [
                <span className="font-medium">{t(`admin.data.dataset.${d.key}`, { defaultValue: d.key })}</span>,
                d.origin,
                d.rows.toLocaleString(),
              ])}
            />
          </Section>

          <Section title={t('admin.data.onlineTitle')} hint={t('admin.data.onlineHint')}>
            <DataTable
              columns={onlineColumns}
              rows={data.online_sources.map((s) => [
                <span className="font-medium">{t(`admin.data.online.${s.source}`, { defaultValue: s.source })}</span>,
                s.cached_words.toLocaleString(),
                s.last_cached_at ? formatDateTime(s.last_cached_at) : '—',
              ])}
            />
          </Section>

          <Section title={t('admin.data.crawlTitle')} hint={t('admin.data.crawlHint')}>
            {data.crawler
              ? <CrawlStatusCard status={data.crawler} />
              : <p className="text-sm text-[var(--color-text-muted)]">{t('admin.data.crawlMissing')}</p>}
          </Section>
        </>
      )}
    </div>
  )
}
