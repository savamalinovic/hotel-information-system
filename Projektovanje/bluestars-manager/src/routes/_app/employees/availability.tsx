import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, type ReactNode } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '../../../lib/api/errorMessage'
import type { WorkerAvailabilityResponse } from '../../../lib/api/types'
import { pageParam, sizeParam, stringParam } from '../../../lib/query/search'
import { useList } from '../../../lib/query/useList'
import { formatDate, formatInstant } from '../../../lib/format/date'
import { Page } from '../../../components/ui/Page'
import { Table, type Column } from '../../../components/ui/Table'
import { Pagination } from '../../../components/ui/Pagination'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { StatusBadge } from '../../../components/ui/Badge'

const WORKER_ROLES = ['AGENT', 'OPERATIONAL_WORKER'] as const

const searchSchema = z.object({
  page: pageParam,
  size: sizeParam,
  role: stringParam,
})

export const Route = createFileRoute('/_app/employees/availability')({
  validateSearch: (search) => searchSchema.parse(search),
  component: AvailabilityPage,
})

function AvailabilityPage() {
  const { t } = useTranslation()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  const list = useList<WorkerAvailabilityResponse>({
    key: 'workforce-availability',
    path: '/workforce/availability',
    query: { page: search.page ?? 0, size: search.size ?? 20, role: search.role },
  })

  const columns = useMemo<Array<Column<WorkerAvailabilityResponse>>>(
    () => [
      {
        key: 'name',
        header: t('employees.name'),
        render: (row) => `${row.name} ${row.surname}`,
      },
      { key: 'role', header: t('employees.role'), render: (row) => row.role },
      { key: 'status', header: t('employees.status'), render: (row) => <StatusBadge value={row.status} /> },
      {
        key: 'clockedIn',
        header: t('employees.clockedIn'),
        render: (row) => (row.clockedInAt ? formatInstant(row.clockedInAt) : '—'),
      },
      {
        key: 'unavailableUntil',
        header: t('employees.unavailableUntil'),
        render: (row) => (row.unavailableUntil ? formatInstant(row.unavailableUntil) : '—'),
      },
      {
        key: 'leave',
        header: t('employees.onLeaveUntil'),
        render: (row) => (row.leaveEndDate ? formatDate(row.leaveEndDate) : '—'),
      },
    ],
    [t],
  )

  return (
    <Page title={t('employees.availability')}>
      <Link to="/employees" className="text-sm text-blue-600 hover:underline">
        ← {t('employees.title')}
      </Link>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <FilterField label={t('employees.role')}>
          <Select
            value={search.role ?? ''}
            onChange={(event) =>
              navigate({ search: { ...search, role: event.target.value || undefined, page: 0 } })
            }
          >
            <option value="">{t('common.all')}</option>
            {WORKER_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
        </FilterField>
      </div>

      {list.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8 text-blue-600" />
        </div>
      ) : list.error ? (
        <ErrorState
          message={errorMessage(list.error, t)}
          action={
            <Button variant="secondary" onClick={() => list.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : list.data && list.data.content.length === 0 ? (
        <EmptyState message={t('common.noResults')} />
      ) : list.data ? (
        <>
          <Table columns={columns} rows={list.data.content} rowKey={(row) => row.workerId} />
          <Pagination
            page={search.page ?? 0}
            totalPages={list.data.totalPages}
            totalElements={list.data.totalElements}
            labels={{
              previous: t('common.previous'),
              next: t('common.next'),
              page: t('common.page'),
              of: t('common.of'),
            }}
            onPageChange={(page) => navigate({ search: { ...search, page } })}
          />
        </>
      ) : null}
    </Page>
  )
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-40">
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  )
}
