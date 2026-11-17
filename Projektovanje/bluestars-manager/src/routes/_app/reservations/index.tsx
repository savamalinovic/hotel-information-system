import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo, type ReactNode } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { apiGet } from '../../../lib/api/client'
import { errorMessage } from '../../../lib/api/errorMessage'
import type { ApartmentDetailsResponse, Page, ReservationDetailsResponse } from '../../../lib/api/types'
import { numberParam, pageParam, sizeParam, stringParam } from '../../../lib/query/search'
import { useList } from '../../../lib/query/useList'
import { formatDate } from '../../../lib/format/date'
import { Page as PageShell } from '../../../components/ui/Page'
import { Table, type Column } from '../../../components/ui/Table'
import { Pagination } from '../../../components/ui/Pagination'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { StatusBadge } from '../../../components/ui/Badge'
import { Money } from '../../../components/ui/Money'

const RESERVATION_STATUSES = ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'] as const

const searchSchema = z.object({
  page: pageParam,
  size: sizeParam,
  apartmentId: numberParam,
  status: stringParam,
  from: stringParam,
  to: stringParam,
})

export const Route = createFileRoute('/_app/reservations/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: ReservationsPage,
})

function ReservationsPage() {
  const { t } = useTranslation()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  const list = useList<ReservationDetailsResponse>({
    key: 'reservations',
    path: '/reservations',
    query: {
      page: search.page ?? 0,
      size: search.size ?? 20,
      apartmentId: search.apartmentId,
      status: search.status,
      from: search.from,
      to: search.to,
    },
  })

  const apartmentsQuery = useQuery({
    queryKey: ['apartments', 'all'],
    queryFn: () => apiGet<Page<ApartmentDetailsResponse>>('/apartments', { size: 100 }),
    select: (data) => data.content,
  })

  const columns = useMemo<Array<Column<ReservationDetailsResponse>>>(
    () => [
      {
        key: 'apartment',
        header: t('reservations.apartment'),
        render: (row) => row.apartmentName,
      },
      {
        key: 'dates',
        header: t('reservations.checkInDate'),
        render: (row) => `${formatDate(row.checkInDate)} → ${formatDate(row.checkOutDate)}`,
      },
      { key: 'guests', header: t('reservations.guestCount'), render: (row) => row.guestCount },
      { key: 'status', header: t('reservations.status'), render: (row) => <StatusBadge value={row.status} /> },
      { key: 'total', header: t('reservations.totalPrice'), render: (row) => <Money value={row.totalPrice} /> },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (row) => (
          <Link
            to="/reservations/$reservationId"
            params={{ reservationId: String(row.reservationId) }}
            className="font-medium text-blue-600 hover:underline"
          >
            {t('common.edit')}
          </Link>
        ),
      },
    ],
    [t],
  )

  return (
    <PageShell
      title={t('reservations.title')}
      actions={
        <Link to="/reservations/new">
          <Button>{t('reservations.create')}</Button>
        </Link>
      }
    >
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <FilterField label={t('reservations.apartment')}>
          <Select
            value={search.apartmentId ?? ''}
            onChange={(event) =>
              navigate({
                search: {
                  ...search,
                  apartmentId: event.target.value ? Number(event.target.value) : undefined,
                  page: 0,
                },
              })
            }
          >
            <option value="">{t('common.all')}</option>
            {(apartmentsQuery.data ?? []).map((apartment) => (
              <option key={apartment.apartmentId} value={apartment.apartmentId}>
                {apartment.name}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label={t('reservations.status')}>
          <Select
            value={search.status ?? ''}
            onChange={(event) =>
              navigate({ search: { ...search, status: event.target.value || undefined, page: 0 } })
            }
          >
            <option value="">{t('common.all')}</option>
            {RESERVATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label={t('reservations.from')}>
          <Input
            type="date"
            value={search.from ?? ''}
            onChange={(event) =>
              navigate({ search: { ...search, from: event.target.value || undefined, page: 0 } })
            }
          />
        </FilterField>
        <FilterField label={t('reservations.to')}>
          <Input
            type="date"
            value={search.to ?? ''}
            onChange={(event) =>
              navigate({ search: { ...search, to: event.target.value || undefined, page: 0 } })
            }
          />
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
          <Table columns={columns} rows={list.data.content} rowKey={(row) => row.reservationId} />
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
    </PageShell>
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
