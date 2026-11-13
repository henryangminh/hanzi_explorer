import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'

export function RadicalsLink() {
  const { t } = useTranslation()
  return (
    <Link
      to="/radicals"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#7c5c3e] hover:bg-[#6a4f35] text-white transition-colors"
    >
      <BookOpen size={14} />
      {t('nav.radicals')}
    </Link>
  )
}
