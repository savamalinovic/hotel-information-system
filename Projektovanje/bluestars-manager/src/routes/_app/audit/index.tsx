import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, type ReactNode } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { enumLabel } from '../../../lib/i18n/enums'
import { errorMessage } from '../../../lib/api/errorMessage'
import type { AuditLogResponse } from '../../../lib/api/types'
import { numberParam, pageParam, sizeParam, stringParam } from '../../../lib/query/search'
import { useList } from '../../../lib/query/useList'
import { formatInstant, localDateTimeToInstant } from '../../../lib/format/date'
import { Page as PageShell } from '../../../components/ui/Page'
import { Table, type Column } from '../../../components/ui/Table'
import { Pagination } from '../../../components/ui/Pagination'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'

const AUDIT_EVENTS = [
  'RESERVATION_CREATED',
  'RESERVATION_STAY_UPDATED',
  'RESERVATION_CANCELLED',
  'RESERVATION_NO_SHOW',
  'CHECK_IN_CLAIMED',
  'CHECK_IN_CLAIM_RELEASED',
  'CHECK_IN_CLAIM_TAKEN_OVER',
  'RESERVATION_CHECKED_IN',
  'RESERVATION_CHECKED_OUT',
  'PAYMENT_RECORDED',
  'PAYMENT_CORRECTED',
  'PAYMENT_REVERSED',
  'DEMO_RECEIPT_GENERATED',
  'TASK_CREATED',
  'TASK_CLAIMED',
  'TASK_STARTED',
  'TASK_BLOCKED',
  'TASK_RESUMED',
  'TASK_COMPLETED',
  'TASK_CANCELLED',
  'TASK_ATTACHMENT_ADDED',
  'EXPENSE_CATEGORY_CREATED',
  'EXPENSE_CATEGORY_UPDATED',
  'OPERATIONAL_EXPENSE_RECORDED',
  'OPERATIONAL_EXPENSE_VOIDED',
  'DAMAGE_REPORTED',
  'DAMAGE_UPDATED',
  'DAMAGE_ATTACHMENT_ADDED',
  'WORKER_CLOCKED_IN',
  'WORKER_BREAK_STARTED',
  'WORKER_BREAK_ENDED',
  'WORKER_CLOCKED_OUT',
  'AVAILABILITY_OVERRIDE_CREATED',
  'AVAILABILITY_OVERRIDE_CLEARED',
  'LEAVE_REQUEST_CREATED',
  'LEAVE_REQUEST_CANCELLED',
  'LEAVE_REQUEST_APPROVED',
  'LEAVE_REQUEST_REJECTED',
  'PUSH_TOKEN_REGISTERED',
  'PUSH_TOKEN_TRANSFERRED',
  'PUSH_TOKEN_UNREGISTERED',
] as const

const searchSchema = z.object({
  page: pageParam,
  size: sizeParam,
  from: stringParam,
  to: stringParam,
  actorId: numberParam,
  event: stringParam,
  reservationId: numberParam,
  apartmentId: numberParam,
  taskId: numberParam,
})

export const Route = createFileRoute('/_app/audit/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: AuditPage,
})

function AuditPage() {
  const { t } = useTranslation()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  const list = useList<AuditLogResponse>({
    key: 'audit-logs',
    path: '/audit-logs',
    query: {
      page: search.page ?? 0,
      size: search.size ?? 20,
      from: search.from ? localDateTimeToInstant(search.from) : undefined,
      to: search.to ? localDateTimeToInstant(search.to) : undefined,
      actorId: search.actorId,
      event: search.event,
      reservationId: search.reservationId,
      apartmentId: search.apartmentId,
      taskId: search.taskId,
    },
  })

  const columns = useMemo<Array<Column<AuditLogResponse>>>(
    () => [
      {
        key: 'time',
        header: t('audit.time'),
        render: (row) => <span className="whitespace-nowrap text-gray-600">{formatInstant(row.occurredAt)}</span>,
      },
      {
        key: 'event',
        header: t('audit.event'),
        render: (row) => (
          <span className="whitespace-nowrap font-medium text-gray-900" title={row.event}>
            {enumLabel(t, 'auditEvent', row.event)}
          </span>
        ),
      },
      {
        key: 'actor',
        header: t('audit.actor'),
        render: (row) => (row.actorId !== null ? String(row.actorId) : '—'),
      },
      {
        key: 'reservation',
        header: t('audit.reservation'),
        render: (row) =>
          row.reservationId !== null ? (
            <Link
              to="/reservations/$reservationId"
              params={{ reservationId: String(row.reservationId) }}
              className="text-blue-600 hover:underline"
            >
              #{row.reservationId}
            </Link>
          ) : (
            '—'
          ),
      },
      {
        key: 'apartment',
        header: t('audit.apartment'),
        render: (row) =>
          row.apartmentId !== null ? (
            <Link
              to="/apartments/$apartmentId"
              params={{ apartmentId: String(row.apartmentId) }}
              className="text-blue-600 hover:underline"
            >
              #{row.apartmentId}
            </Link>
          ) : (
            '—'
          ),
      },
      {
        key: 'task',
        header: t('audit.task'),
        render: (row) =>
          row.taskId !== null ? (
            <Link
              to="/tasks/$taskId"
              params={{ taskId: String(row.taskId) }}
              className="text-blue-600 hover:underline"
            >
              #{row.taskId}
            </Link>
          ) : (
            '—'
          ),
      },
      {
        key: 'details',
        header: t('audit.details'),
        render: (row) => (
          <span className="block max-w-xs truncate text-gray-500" title={row.details}>
            {row.details}
          </span>
        ),
      },
    ],
    [t],
  )

  return (
    <PageShell title={t('audit.title')}>
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <FilterField label={t('audit.from')}>
          <Input
            type="datetime-local"
            value={search.from ?? ''}
            onChange={(event) =>
              navigate({ search: { ...search, from: event.target.value || undefined, page: 0 } })
            }
          />
        </FilterField>
        <FilterField label={t('audit.to')}>
          <Input
            type="datetime-local"
            value={search.to ?? ''}
            onChange={(event) =>
              navigate({ search: { ...search, to: event.target.value || undefined, page: 0 } })
            }
          />
        </FilterField>
        <FilterField label={t('audit.event')}>
          <Select
            value={search.event ?? ''}
            onChange={(event) =>
              navigate({ search: { ...search, event: event.target.value || undefined, page: 0 } })
            }
          >
            <option value="">{t('common.all')}</option>
            {AUDIT_EVENTS.map((event) => (
              <option key={event} value={event}>
                {enumLabel(t, 'auditEvent', event)}
              </option>
            ))}
          </Select>
        </FilterField>
        <NumberFilter
          label={t('audit.actor')}
          value={search.actorId}
          onChange={(value) => navigate({ search: { ...search, actorId: value, page: 0 } })}
        />
        <NumberFilter
          label={t('audit.reservation')}
          value={search.reservationId}
          onChange={(value) => navigate({ search: { ...search, reservationId: value, page: 0 } })}
        />
        <NumberFilter
          label={t('audit.apartment')}
          value={search.apartmentId}
          onChange={(value) => navigate({ search: { ...search, apartmentId: value, page: 0 } })}
        />
        <NumberFilter
          label={t('audit.task')}
          value={search.taskId}
          onChange={(value) => navigate({ search: { ...search, taskId: value, page: 0 } })}
        />
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
        <EmptyState message={t('audit.noEntries')} />
      ) : list.data ? (
        <>
          <Table columns={columns} rows={list.data.content} rowKey={(row) => row.auditLogId} />
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

function NumberFilter({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
}) {
  return (
    <FilterField label={label}>
      <Input
        type="number"
        min={1}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)}
      />
    </FilterField>
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
