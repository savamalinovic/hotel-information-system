import { createFileRoute } from '@tanstack/react-router'
import { useMutation, type UseQueryResult } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { apiDownload } from '../../../lib/api/client'
import { errorMessage } from '../../../lib/api/errorMessage'
import type {
  GuestBookEntryResponse,
  IncomeBookEntryResponse,
  Page,
} from '../../../lib/api/types'
import { pageParam, sizeParam, stringParam } from '../../../lib/query/search'
import { useList } from '../../../lib/query/useList'
import { formatDate, formatInstant } from '../../../lib/format/date'
import { Page as PageShell } from '../../../components/ui/Page'
import { Table, type Column } from '../../../components/ui/Table'
import { Pagination } from '../../../components/ui/Pagination'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { Money } from '../../../components/ui/Money'

const BOOK_TABS = ['domestic', 'foreign', 'income'] as const
type BookTab = (typeof BOOK_TABS)[number]

const searchSchema = z.object({
  tab: z.enum(BOOK_TABS).catch('domestic'),
  page: pageParam,
  size: sizeParam,
  from: stringParam,
  to: stringParam,
  query: stringParam,
})

export const Route = createFileRoute('/_app/books/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: BooksPage,
})

function BooksPage() {
  const { t } = useTranslation()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  const tab: BookTab = search.tab
  const sharedQuery = {
    page: search.page ?? 0,
    size: search.size ?? 20,
    from: search.from,
    to: search.to,
    query: search.query,
  }

  const domestic = useList<GuestBookEntryResponse>({
    key: 'books-domestic',
    path: '/books/domestic-guests',
    query: sharedQuery,
    enabled: tab === 'domestic',
  })
  const foreign = useList<GuestBookEntryResponse>({
    key: 'books-foreign',
    path: '/books/foreign-guests',
    query: sharedQuery,
    enabled: tab === 'foreign',
  })
  const income = useList<IncomeBookEntryResponse>({
    key: 'books-income',
    path: '/books/income',
    query: sharedQuery,
    enabled: tab === 'income',
  })

  const [queryInput, setQueryInput] = useState(search.query ?? '')
  useEffect(() => {
    setQueryInput(search.query ?? '')
  }, [search.query])

  const exportMutation = useMutation({
    mutationFn: () => apiDownload(exportPath(tab), { from: search.from, to: search.to, query: search.query }),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    },
  })

  const tabs = useMemo(
    () => [
      { value: 'domestic' as const, label: t('books.domestic') },
      { value: 'foreign' as const, label: t('books.foreign') },
      { value: 'income' as const, label: t('books.income') },
    ],
    [t],
  )

  return (
    <PageShell
      title={t('books.title')}
      actions={
        <Button
          variant="secondary"
          loading={exportMutation.isPending}
          onClick={() => exportMutation.mutate()}
        >
          {t('books.export')}
        </Button>
      }
    >
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => navigate({ search: { ...search, tab: item.value, page: 0 } })}
            className={`-mb-px rounded-t-md border-b-2 px-4 py-2 text-sm font-medium ${
              tab === item.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <FilterBar
        queryInput={queryInput}
        onQueryInput={setQueryInput}
        onSubmit={(value) => navigate({ search: { ...search, query: value || undefined, page: 0 } })}
        onReset={() => navigate({ search: { ...search, from: undefined, to: undefined, query: undefined, page: 0 } })}
      />

      {exportMutation.error ? (
        <ErrorState message={errorMessage(exportMutation.error, t)} />
      ) : null}

      {tab === 'income' ? (
        <BookTable
          list={income}
          columns={incomeColumns(t)}
          rowKey={(row) => row.incomeBookEntryId}
        />
      ) : (
        <BookTable
          list={tab === 'foreign' ? foreign : domestic}
          columns={guestColumns(t)}
          rowKey={(row) => row.guestBookEntryId}
        />
      )}
    </PageShell>
  )
}

function FilterBar({
  queryInput,
  onQueryInput,
  onSubmit,
  onReset,
}: {
  queryInput: string
  onQueryInput: (value: string) => void
  onSubmit: (value: string) => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <FilterField label={t('books.from')}>
        <Input
          type="date"
          value={search.from ?? ''}
          onChange={(event) =>
            navigate({ search: { ...search, from: event.target.value || undefined, page: 0 } })
          }
        />
      </FilterField>
      <FilterField label={t('books.to')}>
        <Input
          type="date"
          value={search.to ?? ''}
          onChange={(event) =>
            navigate({ search: { ...search, to: event.target.value || undefined, page: 0 } })
          }
        />
      </FilterField>
      <form
        className="flex min-w-56 flex-1 items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(queryInput)
        }}
      >
        <div className="flex-1">
          <FilterField label={t('common.search')}>
            <Input
              type="search"
              value={queryInput}
              onChange={(event) => onQueryInput(event.target.value)}
              placeholder={t('common.search')}
            />
          </FilterField>
        </div>
        <Button type="submit" variant="secondary">
          {t('common.search')}
        </Button>
        <Button type="button" variant="ghost" onClick={onReset}>
          {t('common.reset')}
        </Button>
      </form>
    </div>
  )
}

function BookTable<T>({
  list,
  columns,
  rowKey,
}: {
  list: UseQueryResult<Page<T>>
  columns: Array<Column<T>>
  rowKey: (row: T) => string | number
}) {
  const { t } = useTranslation()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const data = list.data

  if (list.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    )
  }

  if (list.error) {
    return (
      <ErrorState
        message={errorMessage(list.error, t)}
        action={
          <Button variant="secondary" onClick={() => list.refetch()}>
            {t('common.retry')}
          </Button>
        }
      />
    )
  }

  if (data && data.content.length === 0) {
    return <EmptyState message={t('books.noEntries')} />
  }

  if (data) {
    return (
      <>
        <Table columns={columns} rows={data.content} rowKey={rowKey} />
        <Pagination
          page={search.page ?? 0}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          labels={{
            previous: t('common.previous'),
            next: t('common.next'),
            page: t('common.page'),
            of: t('common.of'),
          }}
          onPageChange={(page) => navigate({ search: { ...search, page } })}
        />
      </>
    )
  }

  return null
}

function guestColumns(t: TFunction): Array<Column<GuestBookEntryResponse>> {
  return [
    {
      key: 'guest',
      header: t('books.guest'),
      render: (row) => `${row.name} ${row.surname}`,
    },
    { key: 'document', header: t('books.document'), render: (row) => row.citizenId },
    { key: 'apartment', header: t('books.apartment'), render: (row) => row.apartmentName },
    { key: 'arrived', header: t('books.arrived'), render: (row) => formatInstant(row.arrivedAt) },
    {
      key: 'departure',
      header: t('books.departure'),
      render: (row) => formatDate(row.plannedDepartureDate),
    },
    {
      key: 'reservation',
      header: t('books.reservation'),
      render: (row) => String(row.reservationId),
    },
  ]
}

function incomeColumns(t: TFunction): Array<Column<IncomeBookEntryResponse>> {
  return [
    { key: 'receipt', header: t('books.receiptNumber'), render: (row) => row.receiptNumber },
    {
      key: 'date',
      header: t('books.accountingDate'),
      render: (row) => formatDate(row.accountingDate),
    },
    { key: 'description', header: t('books.description'), render: (row) => row.description },
    {
      key: 'serviceRevenue',
      header: t('books.serviceRevenue'),
      render: (row) => <Money value={row.serviceSaleRevenue} />,
    },
    {
      key: 'totalRevenue',
      header: t('books.totalRevenue'),
      render: (row) => <Money value={row.totalRevenue} />,
    },
    { key: 'vat', header: t('books.vat'), render: (row) => <Money value={row.vatAmount} /> },
    {
      key: 'reservation',
      header: t('books.reservation'),
      render: (row) => String(row.reservationId),
    },
  ]
}

function exportPath(tab: BookTab): string {
  switch (tab) {
    case 'foreign':
      return '/books/foreign-guests/export'
    case 'income':
      return '/books/income/export'
    default:
      return '/books/domestic-guests/export'
  }
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-40">
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  )
}
