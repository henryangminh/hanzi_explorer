import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { RadicalsPage } from '@/features/radicals/RadicalsPage'
import { DictionaryPage } from '@/features/dictionary/DictionaryPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ProfilePage } from '@/features/auth/ProfilePage'
import { NotebooksPage } from '@/features/notebooks/NotebooksPage'

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
      { index: true, element: <Navigate to="/radicals" replace /> },
      { path: 'radicals', element: <RadicalsPage /> },
      { path: 'dictionary', element: <DictionaryPage /> },
      { path: 'notebooks', element: <NotebooksPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
