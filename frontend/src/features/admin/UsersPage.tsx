import { useEffect, useState } from 'react'
import { User } from '@/types'
import api from '@/lib/axios'
import { Check, X, Shield, ShieldOff, Edit, Trash2, RotateCcw, KeyRound } from 'lucide-react'

import { useTranslation } from 'react-i18next'

// Custom tooltip wrapper for instantaneous hover text
function Tooltip({ text, children, position = 'bottom' }: { text: string, children: React.ReactNode, position?: 'bottom' | 'top' | 'left' }) {
  return (
    <div className="relative group inline-flex justify-center items-center">
      {children}
      <span className={`
        pointer-events-none absolute
        ${position === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}
        ${position === 'left' ? 'right-0' : 'left-1/2 -translate-x-1/2'}
        px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap
        bg-gray-800 text-white dark:bg-gray-100 dark:text-black shadow-md
        opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[100]
      `}>
        {text}
        {/* Subtle arrow */ }
        <span className={`absolute border-4 border-transparent
          ${position === 'left' ? 'right-2' : 'left-1/2 -translate-x-1/2'}
          ${position === 'top' ? 'top-full border-t-gray-800 dark:border-t-gray-100' : 'bottom-full border-b-gray-800 dark:border-b-gray-100'}
        `} />
      </span>
    </div>
  )
}

export function UsersPage() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null)
  
  // Create user form state
  const [showAdd, setShowAdd] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    password: '',
    is_admin: false,
    is_active: true
  })

  const [changingPasswordUser, setChangingPasswordUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data } = await api.get<User[]>('/admin/users')
      setUsers(data)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/admin/users', formData)
      setShowAdd(false)
      fetchUsers()
      setFormData({ username: '', display_name: '', password: '', is_admin: false, is_active: true })
    } catch (e: any) {
      alert(e.response?.data?.detail || t('admin.users.errorCreate'))
    }
  }

  const handleUpdate = async (id: number, updates: any) => {
    try {
      await api.patch(`/admin/users/${id}`, updates)
      fetchUsers()
      setEditingUser(null)
    } catch (e: any) {
      alert(e.response?.data?.detail || t('admin.users.errorUpdate'))
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!changingPasswordUser) return
    if (newPassword !== confirmNewPassword) {
      alert(t('admin.users.passwordMismatch'))
      return
    }
    try {
      await api.patch(`/admin/users/${changingPasswordUser.id}`, { new_password: newPassword })
      alert(t('admin.users.changePasswordSuccess'))
      setChangingPasswordUser(null)
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (e: any) {
      alert(e.response?.data?.detail || t('admin.users.errorUpdate'))
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('admin.users.confirmDelete') as string)) return
    try {
      await api.delete(`/admin/users/${id}`)
      fetchUsers()
    } catch (e: any) {
      alert(e.response?.data?.detail || t('admin.users.errorDelete'))
    }
  }

  const handleRestore = async (id: number) => {
    try {
      await api.post(`/admin/users/${id}/restore`)
      fetchUsers()
    } catch (e: any) {
      alert(e.response?.data?.detail || t('admin.users.errorRestore'))
    }
  }

  if (loading && users.length === 0) return <div>{t('common.loading')}</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">{t('admin.users.title')}</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-fg)] rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          {showAdd ? t('admin.users.cancel') : t('admin.users.add')}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleCreate} className="bg-[var(--color-bg-surface)] p-6 rounded-xl border border-[var(--color-border)] space-y-4">
          <h2 className="text-lg font-semibold border-b border-[var(--color-border)] pb-2">{t('admin.users.addNew')}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.users.username')}</label>
              <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-[var(--color-bg)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.users.displayName')}</label>
              <input required value={formData.display_name} onChange={e => setFormData({...formData, display_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-[var(--color-bg)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.users.password')}</label>
              <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-[var(--color-bg)]" />
            </div>
            <div className="flex items-center gap-4 mt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_admin} onChange={e => setFormData({...formData, is_admin: e.target.checked})} />
                <span className="text-sm font-medium">{t('admin.users.isAdmin')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                <span className="text-sm font-medium">{t('admin.users.isActive')}</span>
              </label>
            </div>
          </div>
          <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-fg)] rounded-lg text-sm font-medium">{t('admin.users.save')}</button>
        </form>
      )}

      <div className="bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
            <tr>
              <th className="px-4 py-3 font-medium rounded-tl-xl">{t('admin.users.id')}</th>
              <th className="px-4 py-3 font-medium">{t('admin.users.username')}</th>
              <th className="px-4 py-3 font-medium">{t('admin.users.displayName')}</th>
              <th className="px-4 py-3 font-medium">{t('admin.users.status')}</th>
              <th className="px-4 py-3 font-medium text-center">{t('admin.users.role')}</th>
              <th className="px-4 py-3 font-medium text-right rounded-tr-xl">{t('admin.users.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {users.map(user => {
              const isEditing = editingUser?.id === user.id
              return (
                <tr key={user.id} className={'hover:bg-[var(--color-bg-subtle)] ' + (user.is_deleted ? 'opacity-60' : '')}>
                  <td className="px-4 py-3">{user.id}</td>
                  <td className="px-4 py-3 font-medium">{user.username}</td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input 
                        className="px-2 py-1 border rounded bg-[var(--color-bg)]" 
                        value={editingUser.display_name || ''} 
                        onChange={e => setEditingUser({...editingUser, display_name: e.target.value})}
                      />
                    ) : user.display_name}
                  </td>
                  <td className="px-4 py-3">
                    {user.is_deleted ? (
                      <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium">{t('admin.users.statusDeleted')}</span>
                    ) : user.is_active ? (
                      <span className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium">{t('admin.users.statusActive')}</span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-600 text-white rounded text-xs font-medium">{t('admin.users.statusLocked')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input 
                        type="checkbox" 
                        checked={editingUser.is_admin} 
                        onChange={e => setEditingUser({...editingUser, is_admin: e.target.checked})} 
                      />
                    ) : user.is_admin ? (
                      <Tooltip position="top" text={t('admin.users.tooltipRoleAdmin')}><Shield size={16} className="text-purple-600 inline-block outline-none" /></Tooltip>
                    ) : (
                      <Tooltip position="top" text={t('admin.users.tooltipRoleNotAdmin')}><ShieldOff size={16} className="text-[var(--color-text-muted)] inline-block opacity-50 outline-none" /></Tooltip>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-2 text-[var(--color-text-muted)]">
                        <Tooltip position="top" text={t('admin.users.tooltipSave')}>
                          <button onClick={() => {
                            const payload: any = {
                              display_name: editingUser.display_name,
                              is_admin: editingUser.is_admin,
                              is_active: editingUser.is_active
                            }
                            handleUpdate(user.id, payload)
                          }} className="text-green-600 hover:text-green-700 outline-none"><Check size={18} /></button>
                        </Tooltip>
                        <Tooltip position="top" text={t('admin.users.tooltipCancel')}>
                          <button onClick={() => setEditingUser(null)} className="text-red-500 hover:text-red-600 outline-none"><X size={18} /></button>
                        </Tooltip>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-4 text-[var(--color-text-muted)] mt-1">
                        <Tooltip position="top" text={t('admin.users.tooltipChangePassword')}>
                          <button onClick={() => setChangingPasswordUser(user)} className="hover:text-[var(--color-text)] outline-none"><KeyRound size={16} /></button>
                        </Tooltip>
                        <Tooltip position="top" text={t('admin.users.tooltipEdit')}>
                          <button onClick={() => setEditingUser(user)} className="hover:text-[var(--color-text)] outline-none"><Edit size={16} /></button>
                        </Tooltip>
                        {!user.is_deleted ? (
                          <Tooltip position="top" text={t('admin.users.tooltipDelete')}>
                             <button onClick={() => handleDelete(user.id)} className="text-red-500 hover:text-red-600 outline-none"><Trash2 size={16} /></button>
                          </Tooltip>
                        ) : (
                          <Tooltip position="top" text={t('admin.users.tooltipRestore')}>
                             <button onClick={() => handleRestore(user.id)} className="text-green-600 hover:text-green-700 outline-none"><RotateCcw size={16} /></button>
                          </Tooltip>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {changingPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) { setChangingPasswordUser(null); setNewPassword(''); setConfirmNewPassword(''); } }}>
          <div className="bg-[var(--color-bg-surface)] p-6 rounded-2xl border border-[var(--color-border)] shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-1 text-[var(--color-text)]">
              {t('admin.users.changePasswordModalTitle', { account: changingPasswordUser.username })}
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('admin.users.newPassword')}</label>
                <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('admin.users.confirmNewPassword')}</label>
                <input required type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setChangingPasswordUser(null); setNewPassword(''); setConfirmNewPassword(''); }} className="px-4 py-2 bg-[var(--color-bg-subtle)] text-[var(--color-text)] rounded-lg text-sm font-medium hover:brightness-95">
                  {t('admin.users.cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-fg)] rounded-lg text-sm font-medium hover:brightness-110">
                  {t('admin.users.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
