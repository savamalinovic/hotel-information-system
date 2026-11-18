import { createFileRoute, Link, Navigate, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth/AuthContext'
import { getSession } from '../lib/auth/store'
import { FullPageLoader } from '../components/ui/Spinner'

export const Route = createFileRoute('/_app')({
  beforeLoad: ({ location }) => {
    if (getSession()?.role !== 'MANAGER') {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: AppLayout,
})

function AppLayout() {
  const { t } = useTranslation()
  const { ready, session, logout } = useAuth()
  const navigate = useNavigate()

  if (!ready) return <FullPageLoader />
  if (!session) return <Navigate to="/login" search={{ redirect: '/' }} />

  const navItems: Array<{
    to: '/' | '/apartments' | '/reservations' | '/employees' | '/tasks' | '/expenses' | '/damages'
    label: string
  }> = [
    { to: '/', label: t('nav.dashboard') },
    { to: '/apartments', label: t('nav.apartments') },
    { to: '/reservations', label: t('nav.reservations') },
    { to: '/employees', label: t('nav.employees') },
    { to: '/tasks', label: t('nav.tasks') },
    { to: '/expenses', label: t('nav.expenses') },
    { to: '/damages', label: t('nav.damages') },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-4 text-sm font-semibold text-gray-900">
          {t('common.appName')}
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <span className="text-sm text-gray-500">{t('common.appName')}</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">{session.email}</span>
            <button
              type="button"
              onClick={() => {
                logout()
                void navigate({ to: '/login', search: { redirect: '/' } })
              }}
              className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              {t('common.logout')}
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
