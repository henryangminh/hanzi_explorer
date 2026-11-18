import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { wordReportsApi } from '@/api/wordReportsApi'
import { getErrorDetail } from '@/lib/axios'
import type { WordReport, WordReportStatus } from '@/types'

/** Reports with the chosen status; an action removes the report from the list (it changed tab or is gone). */
export function useWordReports() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<WordReportStatus>('open')
  const [loaded, setLoaded] = useState<{ status: WordReportStatus; reports: WordReport[] } | null>(null)

  useEffect(() => {
    let cancelled = false
    wordReportsApi.list(status).then((reports) => { if (!cancelled) setLoaded({ status, reports }) })
    return () => { cancelled = true }
  }, [status])

  async function run(id: number, action: () => Promise<void>) {
    try {
      await action()
      setLoaded((prev) => prev && { ...prev, reports: prev.reports.filter((r) => r.id !== id) })
    } catch (e) {
      alert(getErrorDetail(e) || t('admin.reports.error'))
    }
  }

  const current = loaded?.status === status
  return {
    status,
    setStatus,
    reports: current ? loaded.reports : [],
    loading: !current,
    resolve: (id: number) => run(id, () => wordReportsApi.setStatus(id, 'resolved')),
    reopen: (id: number) => run(id, () => wordReportsApi.setStatus(id, 'open')),
    remove: (id: number) => run(id, () => wordReportsApi.remove(id)),
  }
}
