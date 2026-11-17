import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { apiGet, type QueryValue } from '../../lib/api/client'
import type { AnalyticsResponse, Page } from '../../lib/api/types'
import { daysAgoLocal, todayLocal } from '../../lib/format/date'
import { Card } from '../../components/ui/Card'
import { Money } from '../../components/ui/Money'
import { Spinner } from '../../components/ui/Spinner'

export const Route = createFileRoute('/_app/')({
  component: DashboardPage,
})

function useAnalytics() {
  const from = daysAgoLocal(29)
  const to = todayLocal()
  return useQuery({
    queryKey: ['analytics', from, to],
    queryFn: () => apiGet<AnalyticsResponse>('/analytics', { from, to }),
  })
}

function useCount(path: string, query: Record<string, QueryValue>, key: string) {
  return useQuery({
    queryKey: [key, query],
    queryFn: () => apiGet<Page<unknown>>(path, { ...query, size: 1 }),
    select: (data) => data.totalElements,
  })
}

function DashboardPage() {
  const { t } = useTranslation()
  const analytics = useAnalytics()
  const dirty = useCount('/apartments', { status: 'DIRTY' }, 'apartments-dirty')
  const outOfOrder = useCount('/apartments', { outOfOrder: true }, 'apartments-out-of-order')
  const pendingLeave = useCount('/workforce/leave-requests', { status: 'PENDING' }, 'leave-pending')

  if (analytics.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    )
  }

  if (analytics.error || !analytics.data) {
    return <p className="text-sm text-red-600">{t('errors.INTERNAL_ERROR')}</p>
  }

  const data = analytics.data
  const financial = data.financial
  const reservations = data.reservations
  const tasks = data.tasks
  const workforce = data.workforce

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard.title')}</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t('dashboard.revenue')} value={<Money value={financial.revenue} />} />
        <StatCard label={t('dashboard.expenses')} value={<Money value={financial.operationalExpenses} />} />
        <StatCard label={t('dashboard.netResult')} value={<Money value={financial.netResult} />} />
        <StatCard label={t('dashboard.reservations')} value={String(reservations.reservationCount)} />
        <StatCard label={t('dashboard.occupancy')} value={`${reservations.occupancyPercentage.toFixed(1)}%`} />
        <StatCard label={t('dashboard.presentWorkers')} value={String(workforce.presentWorkers)} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title={t('dashboard.reservationsByStatus')}>
          <NameValueList items={reservations.byStatus.map((item) => ({ name: item.name, value: String(item.count) }))} />
        </Card>
        <Card title={t('dashboard.tasksByStatus')}>
          <NameValueList items={tasks.byStatus.map((item) => ({ name: item.name, value: String(item.count) }))} />
        </Card>
        <Card title={t('dashboard.workforce')}>
          <NameValueList
            items={[
              { name: t('dashboard.presentWorkers'), value: String(workforce.presentWorkers) },
              { name: t('dashboard.availableWorkers'), value: String(workforce.availableWorkers) },
              { name: t('dashboard.busyWorkers'), value: String(workforce.busyWorkers) },
            ]}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title={t('dashboard.openTasks')}>
          <p className="text-2xl font-semibold text-gray-900">{tasks.newCount}</p>
        </Card>
        <Card title={t('dashboard.blockedTasks')}>
          <p className="text-2xl font-semibold text-gray-900">{tasks.blockedCount}</p>
        </Card>
        <Card title={t('dashboard.pendingLeaveRequests')}>
          <p className="text-2xl font-semibold text-gray-900">{pendingLeave.data ?? '—'}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title={t('dashboard.revenueByType')}>
          <NameValueList
            items={financial.revenueByApartmentType.map((item) => ({ name: item.name, value: item.amount }))}
            money
          />
        </Card>
        <Card title={t('dashboard.expensesByCategory')}>
          <NameValueList
            items={financial.expensesByCategory.map((item) => ({ name: item.name, value: item.amount }))}
            money
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title={t('dashboard.dirtyApartments')}>
          <p className="text-2xl font-semibold text-gray-900">{dirty.data ?? '—'}</p>
        </Card>
        <Card title={t('dashboard.outOfOrderApartments')}>
          <p className="text-2xl font-semibold text-gray-900">{outOfOrder.data ?? '—'}</p>
        </Card>
      </div>

      <Card title={t('dashboard.revenueTrend')}>
        <ul className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4 lg:grid-cols-7">
          {financial.dailyTrend.slice(-14).map((day) => (
            <li key={day.date} className="rounded-md bg-gray-50 p-2">
              <div className="text-xs text-gray-500">{day.date}</div>
              <div className="font-medium text-gray-900">
                <Money value={day.revenue} />
              </div>
              <div className="text-xs text-gray-500">
                <Money value={day.operationalExpenses} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-gray-900">{value}</div>
    </div>
  )
}

function NameValueList({
  items,
  money = false,
}: {
  items: Array<{ name: string; value: string }>
  money?: boolean
}) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.name} className="flex items-center justify-between gap-2">
          <span className="text-gray-600">{item.name}</span>
          <span className="font-medium text-gray-900">
            {money ? <Money value={item.value} /> : item.value}
          </span>
        </li>
      ))}
    </ul>
  )
}
