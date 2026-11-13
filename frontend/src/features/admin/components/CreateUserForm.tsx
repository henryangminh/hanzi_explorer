import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AdminUserCreate } from '@/api/adminApi'

const EMPTY: AdminUserCreate = { username: '', display_name: '', password: '', is_admin: false, is_active: true }
const INPUT = 'w-full px-3 py-2 border rounded-lg bg-[var(--color-bg)]'

/** New-user form; resets after a successful create. */
export function CreateUserForm({ onCreate }: { onCreate: (input: AdminUserCreate) => Promise<boolean> }) {
  const { t } = useTranslation()
  const [form, setForm] = useState(EMPTY)
  const set = <K extends keyof AdminUserCreate>(key: K, value: AdminUserCreate[K]) => setForm((f) => ({ ...f, [key]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (await onCreate(form)) setForm(EMPTY)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--color-bg-surface)] p-6 rounded-xl border border-[var(--color-border)] space-y-4">
      <h2 className="text-lg font-semibold border-b border-[var(--color-border)] pb-2">{t('admin.users.addNew')}</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('admin.users.username')}</label>
          <input required value={form.username} onChange={(e) => set('username', e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('admin.users.displayName')}</label>
          <input required value={form.display_name} onChange={(e) => set('display_name', e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('admin.users.password')}</label>
          <input required type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className={INPUT} />
        </div>
        <div className="flex items-center gap-4 mt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_admin} onChange={(e) => set('is_admin', e.target.checked)} />
            <span className="text-sm font-medium">{t('admin.users.isAdmin')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
            <span className="text-sm font-medium">{t('admin.users.isActive')}</span>
          </label>
        </div>
      </div>
      <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-fg)] rounded-lg text-sm font-medium">
        {t('admin.users.save')}
      </button>
    </form>
  )
}
