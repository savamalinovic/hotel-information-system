import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { enumLabel } from '../../../lib/i18n/enums'
import { apiGet } from '../../../lib/api/client'
import { errorMessage } from '../../../lib/api/errorMessage'
import type { ApartmentDetailsResponse, ApartmentTypeResponse, Page } from '../../../lib/api/types'
import { booleanParam, numberParam, pageParam, sizeParam, stringParam } from '../../../lib/query/search'
import { useList } from '../../../lib/query/useList'
import { Page as PageShell } from '../../../components/ui/Page'
import { Table, type Column } from '../../../components/ui/Table'
import { Pagination } from '../../../components/ui/Pagination'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { Badge, StatusBadge } from '../../../components/ui/Badge'
import { ApartmentFormModal } from '../../../components/apartments/ApartmentFormModal'

const APARTMENT_STATUSES = ['READY', 'DIRTY', 'CLEANING', 'MAINTENANCE'] as const

const searchSchema = z.object({
  page: pageParam,
  size: sizeParam,
  status: stringParam,
  apartmentTypeId: numberParam,
  active: booleanParam,
  outOfOrder: booleanParam,
})

export const Route = createFileRoute('/_app/apartments/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: ApartmentsPage,
})

function ApartmentsPage() {
  const { t } = useTranslation()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  const list = useList<ApartmentDetailsResponse>({
    key: 'apartments',
    path: '/apartments',
    query: {
      page: search.page ?? 0,
      size: search.size ?? 20,
      status: search.status,
      apartmentTypeId: search.apartmentTypeId,
      active: search.active === 'true' ? true : search.active === 'false' ? false : undefined,
      outOfOrder:
        search.outOfOrder === 'true' ? true : search.outOfOrder === 'false' ? false : undefined,
    },
  })

  const typesQuery = useQuery({
    queryKey: ['apartment-types', 'all'],
    queryFn: () => apiGet<Page<ApartmentTypeResponse>>('/apartment-types', { size: 100 }),
    select: (data) => data.content,
  })

  const [creating, setCreating] = useState(false)

  const columns = useMemo<Array<Column<ApartmentDetailsResponse>>>(
    () => [
      {
        key: 'name',
        header: t('apartments.name'),
        render: (row) => (
          <Link
            to="/apartments/$apartmentId"
            params={{ apartmentId: String(row.apartmentId) }}
            className="font-medium text-blue-600 hover:underline"
          >
            {row.name}
          </Link>
        ),
      },
      { key: 'type', header: t('apartments.type'), render: (row) => row.type.name },
      { key: 'floor', header: t('apartments.floor'), render: (row) => row.floor },
      {
        key: 'status',
        header: t('apartments.effectiveStatus'),
        render: (row) => <StatusBadge kind="apartmentStatus" value={row.effectiveStatus} />,
      },
      {
        key: 'active',
        header: t('apartments.active'),
        render: (row) => (
          <Badge tone={row.active ? 'green' : 'gray'}>
            {t(row.active ? 'common.active' : 'common.inactive')}
          </Badge>
        ),
      },
    ],
    [t],
  )

  return (
    <PageShell
      title={t('apartments.title')}
      actions={
        <>
          <Link to="/apartments/types">
            <Button variant="secondary">{t('apartments.typesTitle')}</Button>
          </Link>
          <Button onClick={() => setCreating(true)}>{t('apartments.create')}</Button>
        </>
      }
    >
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <FilterField label={t('apartments.status')}>
          <Select
            value={search.status ?? ''}
            onChange={(event) =>
              navigate({ search: { ...search, status: event.target.value || undefined, page: 0 } })
            }
          >
            <option value="">{t('common.all')}</option>
            {APARTMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {enumLabel(t, 'apartmentStatus', status)}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label={t('apartments.type')}>
          <Select
            value={search.apartmentTypeId ?? ''}
            onChange={(event) =>
              navigate({
                search: {
                  ...search,
                  apartmentTypeId: event.target.value ? Number(event.target.value) : undefined,
                  page: 0,
                },
              })
            }
          >
            <option value="">{t('common.all')}</option>
            {(typesQuery.data ?? []).map((type) => (
              <option key={type.apartmentTypeId} value={type.apartmentTypeId}>
                {type.name}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label={t('apartments.active')}>
          <Select
            value={search.active ?? ''}
            onChange={(event) =>
              navigate({
                search: {
                  ...search,
                  active: event.target.value === '' ? undefined : (event.target.value as 'true' | 'false'),
                  page: 0,
                },
              })
            }
          >
            <option value="">{t('common.all')}</option>
            <option value="true">{t('common.active')}</option>
            <option value="false">{t('common.inactive')}</option>
          </Select>
        </FilterField>
        <FilterField label={t('apartments.outOfOrder')}>
          <Select
            value={search.outOfOrder ?? ''}
            onChange={(event) =>
              navigate({
                search: {
                  ...search,
                  outOfOrder:
                    event.target.value === '' ? undefined : (event.target.value as 'true' | 'false'),
                  page: 0,
                },
              })
            }
          >
            <option value="">{t('common.all')}</option>
            <option value="true">{t('common.yes')}</option>
            <option value="false">{t('common.no')}</option>
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
          <Table columns={columns} rows={list.data.content} rowKey={(row) => row.apartmentId} />
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

      <ApartmentFormModal
        open={creating}
        title={t('apartments.create')}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false)
          void list.refetch()
        }}
      />
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
