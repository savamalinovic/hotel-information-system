import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { enumLabel, type EnumKind } from '../../../lib/i18n/enums'
import { apiGet } from '../../../lib/api/client'
import type {
  AnalyticsResponse,
  ApartmentTypeOccupancy,
  DailyFinancialPoint,
  WorkerCompletion,
} from '../../../lib/api/types'
import { daysAgoLocal, formatDate, formatShortDate, todayLocal } from '../../../lib/format/date'
import { formatMoney } from '../../../lib/format/money'
import { formatNumber, formatPercent } from '../../../lib/format/number'
import { stringParam } from '../../../lib/query/search'
import { errorMessage } from '../../../lib/api/errorMessage'
import { Page as PageShell } from '../../../components/ui/Page'
import { Card } from '../../../components/ui/Card'
import { Money } from '../../../components/ui/Money'
import { Spinner } from '../../../components/ui/Spinner'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Table, type Column } from '../../../components/ui/Table'

const searchSchema = z.object({
  from: stringParam,
  to: stringParam,
})

export const Route = createFileRoute('/_app/analytics/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: AnalyticsPage,
})

function AnalyticsPage() {
  const { t } = useTranslation()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  const from = search.from ?? daysAgoLocal(29)
  const to = search.to ?? todayLocal()

  const analytics = useQuery({
    queryKey: ['analytics', from, to],
    queryFn: () => apiGet<AnalyticsResponse>('/analytics', { from, to }),
  })

  const setRange = (days: number) => {
    navigate({ search: { from: daysAgoLocal(days - 1), to: todayLocal() } })
  }

  return (
    <PageShell title={t('analytics.title')}>
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-end gap-2">
          <RangeButton label={t('analytics.last7Days')} onClick={() => setRange(7)} />
          <RangeButton label={t('analytics.last30Days')} onClick={() => setRange(30)} />
          <RangeButton label={t('analytics.last90Days')} onClick={() => setRange(90)} />
        </div>
        <div className="min-w-40">
          <label className="mb-1 block text-xs font-medium text-gray-500">{t('analytics.from')}</label>
          <Input
            type="date"
            value={from}
            onChange={(event) =>
              navigate({ search: { ...search, from: event.target.value || undefined } })
            }
          />
        </div>
        <div className="min-w-40">
          <label className="mb-1 block text-xs font-medium text-gray-500">{t('analytics.to')}</label>
          <Input
            type="date"
            value={to}
            onChange={(event) =>
              navigate({ search: { ...search, to: event.target.value || undefined } })
            }
          />
        </div>
      </div>

      {analytics.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8 text-blue-600" />
        </div>
      ) : analytics.error || !analytics.data ? (
        <ErrorState
          message={errorMessage(analytics.error, t)}
          action={
            <Button variant="secondary" onClick={() => analytics.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : (
        <AnalyticsBody data={analytics.data} />
      )}
    </PageShell>
  )
}

function RangeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="secondary" onClick={onClick}>
      {label}
    </Button>
  )
}

function AnalyticsBody({ data }: { data: AnalyticsResponse }) {
  const { t } = useTranslation()
  const financial = data.financial
  const reservations = data.reservations
  const tasks = data.tasks
  const workforce = data.workforce

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label={t('analytics.revenue')} value={<Money value={financial.revenue} />} />
        <StatCard label={t('analytics.expenses')} value={<Money value={financial.operationalExpenses} />} />
        <StatCard label={t('analytics.netResult')} value={<Money value={financial.netResult} />} />
        <StatCard label={t('analytics.averageReservationValue')} value={<Money value={financial.averageReservationValue} />} />
        <StatCard label={t('analytics.paidAmount')} value={<Money value={financial.paidAmount} />} />
        <StatCard label={t('analytics.unpaidAmount')} value={<Money value={financial.unpaidAmount} />} />
        <StatCard label={t('analytics.damageCount')} value={String(financial.damageCount)} />
        <StatCard label={t('analytics.confirmedDamageAmount')} value={<Money value={financial.confirmedDamageAmount} />} />
      </div>

      <Card title={t('analytics.dailyTrend')}>
        <DailyTrendChart points={financial.dailyTrend} />
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title={t('analytics.revenueByType')}>
          <MoneyList items={financial.revenueByApartmentType} />
        </Card>
        <Card title={t('analytics.expensesByCategory')}>
          <MoneyList items={financial.expensesByCategory} />
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label={t('analytics.reservationCount')} value={String(reservations.reservationCount)} />
        <StatCard label={t('analytics.nights')} value={String(reservations.nights)} />
        <StatCard label={t('analytics.occupancy')} value={formatPercent(reservations.occupancyPercentage)} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title={t('analytics.reservationsByStatus')}>
          <DistributionList items={reservations.byStatus} kind="reservationStatus" />
        </Card>
        <Card title={t('analytics.reservationsByType')}>
          <OccupancyTable rows={reservations.byApartmentType} />
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label={t('analytics.newCount')} value={String(tasks.newCount)} />
        <StatCard label={t('analytics.blockedCount')} value={String(tasks.blockedCount)} />
        <StatCard
          label={t('analytics.averageCheckoutToReady')}
          value={formatNumber(tasks.averageCheckoutToReadyMinutes)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title={t('analytics.tasksByStatus')}>
          <DistributionList items={tasks.byStatus} kind="taskStatus" />
        </Card>
        <Card title={t('analytics.tasksBySpecialization')}>
          <DistributionList items={tasks.bySpecialization} kind="specialization" />
        </Card>
      </div>

      <Card title={t('analytics.completedByWorker')}>
        <WorkerCompletionTable rows={tasks.completedByWorker} />
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label={t('analytics.presentWorkers')} value={String(workforce.presentWorkers)} />
        <StatCard label={t('analytics.availableWorkers')} value={String(workforce.availableWorkers)} />
        <StatCard label={t('analytics.busyWorkers')} value={String(workforce.busyWorkers)} />
      </div>
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

function MoneyList({ items }: { items: Array<{ name: string; amount: string }> }) {
  if (items.length === 0) return <EmptyNote />
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.name} className="flex items-center justify-between gap-2">
          <span className="text-gray-600">{item.name}</span>
          <Money value={item.amount} className="font-medium text-gray-900" />
        </li>
      ))}
    </ul>
  )
}

function DistributionList({
  items,
  kind,
}: {
  items: Array<{ name: string; count: number }>
  kind: EnumKind
}) {
  const { t } = useTranslation()
  if (items.length === 0) return <EmptyNote />
  const max = Math.max(1, ...items.map((item) => item.count))
  return (
    <ul className="space-y-3 text-sm">
      {items.map((item) => (
        <li key={item.name}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-600">{enumLabel(t, kind, item.name)}</span>
            <span className="font-medium text-gray-900">{item.count}</span>
          </div>
          <div className="mt-1 h-1.5 rounded bg-gray-100">
            <div
              className="h-1.5 rounded bg-blue-500"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function OccupancyTable({ rows }: { rows: ApartmentTypeOccupancy[] }) {
  const { t } = useTranslation()
  const columns: Array<Column<ApartmentTypeOccupancy>> = [
    { key: 'type', header: t('analytics.apartmentType'), render: (row) => row.apartmentType },
    {
      key: 'reservations',
      header: t('analytics.reservationCount'),
      render: (row) => String(row.reservationCount),
    },
    { key: 'nights', header: t('analytics.nights'), render: (row) => String(row.nights) },
    {
      key: 'occupancy',
      header: t('analytics.occupancyShort'),
      render: (row) => formatPercent(row.occupancyPercentage),
    },
  ]
  if (rows.length === 0) return <EmptyNote />
  return <Table columns={columns} rows={rows} rowKey={(row) => row.apartmentType} />
}

function WorkerCompletionTable({ rows }: { rows: WorkerCompletion[] }) {
  const { t } = useTranslation()
  const columns: Array<Column<WorkerCompletion>> = [
    { key: 'worker', header: t('analytics.worker'), render: (row) => row.workerName },
    {
      key: 'completed',
      header: t('analytics.completedTasks'),
      render: (row) => String(row.completedTasks),
    },
  ]
  if (rows.length === 0) return <EmptyNote />
  return <Table columns={columns} rows={rows} rowKey={(row) => String(row.workerId)} />
}

function DailyTrendChart({ points }: { points: DailyFinancialPoint[] }) {
  const recent = points.slice(-14)
  if (recent.length === 0) return <EmptyNote />
  const max = Math.max(
    1,
    ...recent.map((point) => Math.max(Number(point.revenue), Number(point.operationalExpenses))),
  )
  return (
    <div className="flex items-end gap-1 overflow-x-auto pb-1">
      {recent.map((point) => (
        <div
          key={point.date}
          className="flex min-w-8 flex-1 flex-col items-center gap-1"
          title={`${formatDate(point.date)} · ${formatMoney(point.revenue)} / ${formatMoney(point.operationalExpenses)}`}
        >
          <div className="flex h-28 w-full items-end justify-center gap-0.5">
            <div
              className="w-2/5 rounded-t bg-blue-500"
              style={{ height: `${(Number(point.revenue) / max) * 100}%` }}
            />
            <div
              className="w-2/5 rounded-t bg-gray-300"
              style={{ height: `${(Number(point.operationalExpenses) / max) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500">{formatShortDate(point.date)}</span>
        </div>
      ))}
    </div>
  )
}

function EmptyNote() {
  const { t } = useTranslation()
  return <p className="text-sm text-gray-400">{t('analytics.noData')}</p>
}
