import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { HomePage } from '@/features/dashboard/HomePage'
import { RadicalsPage } from '@/features/radicals/RadicalsPage'
import { DictionaryPage } from '@/features/dictionary/DictionaryPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ChangePasswordPage } from '@/features/settings/ChangePasswordPage'
import { ProfilePage } from '@/features/auth/ProfilePage'
import { NotebooksPage } from '@/features/notebooks/NotebooksPage'
import { MyNotesPage } from '@/features/my-notes/MyNotesPage'
import { AdminRoute } from './AdminRoute'
import { UserRoute } from './UserRoute'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { DashboardPage } from '@/features/admin/DashboardPage'
import { UsersPage } from '@/features/admin/UsersPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        element: <UserRoute />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <HomePage /> },
          { path: 'radicals', element: <RadicalsPage /> },
          { path: 'dictionary', element: <DictionaryPage /> },
          { path: 'notebooks', element: <NotebooksPage /> },
          { path: 'my-notes', element: <MyNotesPage /> },
        ],
      },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/change-password', element: <ChangePasswordPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'data', element: <div>Quản trị Dữ Liệu - Coming Soon</div> },
      { path: 'moderation', element: <div>Kiểm duyệt - Coming Soon</div> },
      { path: 'notebooks', element: <div>Sổ tay chung - Coming Soon</div> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
