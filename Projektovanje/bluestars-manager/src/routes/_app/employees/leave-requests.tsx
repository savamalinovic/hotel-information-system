import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { enumLabel } from '../../../lib/i18n/enums'
import { apiGet, apiPost } from '../../../lib/api/client'
import { errorMessage } from '../../../lib/api/errorMessage'
import type { LeaveRequestResponse, ManagedUserResponse, Page } from '../../../lib/api/types'
import { numberParam, pageParam, sizeParam, stringParam } from '../../../lib/query/search'
import { useList } from '../../../lib/query/useList'
import { formatDate, todayLocal } from '../../../lib/format/date'
import { Page as PageShell } from '../../../components/ui/Page'
import { Table, type Column } from '../../../components/ui/Table'
import { Pagination } from '../../../components/ui/Pagination'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { Field } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { StatusBadge } from '../../../components/ui/Badge'

const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const

const searchSchema = z.object({
  page: pageParam,
  size: sizeParam,
  workerId: numberParam,
  status: stringParam,
})

export const Route = createFileRoute('/_app/employees/leave-requests')({
  validateSearch: (search) => searchSchema.parse(search),
  component: LeaveRequestsPage,
})

function LeaveRequestsPage() {
  const { t } = useTranslation()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const queryClient = useQueryClient()

  const list = useList<LeaveRequestResponse>({
    key: 'leave-requests',
    path: '/workforce/leave-requests',
    query: {
      page: search.page ?? 0,
      size: search.size ?? 20,
      workerId: search.workerId,
      status: search.status,
    },
  })

  const users = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => apiGet<Page<ManagedUserResponse>>('/users', { size: 100 }),
    select: (data) => data.content,
  })

  const [rejecting, setRejecting] = useState<LeaveRequestResponse | null>(null)

  const approveMutation = useMutation({
    mutationFn: (id: number) => apiPost(`/workforce/leave-requests/${id}/approve`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
    },
  })

  const columns = useMemo<Array<Column<LeaveRequestResponse>>>(
    () => [
      {
        key: 'worker',
        header: t('employees.worker'),
        render: (row) => `${row.workerName} ${row.workerSurname}`,
      },
      {
        key: 'period',
        header: t('employees.startDate'),
        render: (row) => `${formatDate(row.startDate)} → ${formatDate(row.endDate)}`,
      },
      { key: 'reason', header: t('employees.reason'), render: (row) => row.reason },
      { key: 'status', header: t('employees.status'), render: (row) => <StatusBadge kind="leaveStatus" value={row.status} /> },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (row) => {
          const ended = row.endDate < todayLocal()
          if (row.status !== 'PENDING') return null
          if (ended) return <span className="text-xs text-gray-400">{t('employees.periodEnded')}</span>
          return (
            <div className="flex gap-1">
              <Button variant="ghost" onClick={() => approveMutation.mutate(row.leaveRequestId)}>
                {t('employees.approve')}
              </Button>
              <Button variant="ghost" onClick={() => setRejecting(row)}>
                {t('employees.reject')}
              </Button>
            </div>
          )
        },
      },
    ],
    [t, approveMutation],
  )

  return (
    <PageShell title={t('employees.leaveRequests')}>
      <Link to="/employees" className="text-sm text-blue-600 hover:underline">
        ← {t('employees.title')}
      </Link>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <FilterField label={t('employees.worker')}>
          <Select
            value={search.workerId ?? ''}
            onChange={(event) =>
              navigate({
                search: {
                  ...search,
                  workerId: event.target.value ? Number(event.target.value) : undefined,
                  page: 0,
                },
              })
            }
          >
            <option value="">{t('common.all')}</option>
            {(users.data ?? []).map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} {user.surname}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label={t('employees.status')}>
          <Select
            value={search.status ?? ''}
            onChange={(event) =>
              navigate({ search: { ...search, status: event.target.value || undefined, page: 0 } })
            }
          >
            <option value="">{t('common.all')}</option>
            {LEAVE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {enumLabel(t, 'leaveStatus', status)}
              </option>
            ))}
          </Select>
        </FilterField>
      </div>

      {approveMutation.error ? (
        <ErrorState message={errorMessage(approveMutation.error, t)} />
      ) : null}

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
          <Table columns={columns} rows={list.data.content} rowKey={(row) => row.leaveRequestId} />
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

      {rejecting ? (
        <RejectModal
          request={rejecting}
          onClose={() => setRejecting(null)}
          onSaved={() => {
            setRejecting(null)
            void list.refetch()
          }}
        />
      ) : null}
    </PageShell>
  )
}

function RejectModal({
  request,
  onClose,
  onSaved,
}: {
  request: LeaveRequestResponse
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const schema = useMemo(() => z.object({ reason: z.string().min(1, t('employees.reasonRequired')).max(300) }), [t])
  type Values = z.infer<typeof schema>

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { reason: '' } })

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      apiPost(`/workforce/leave-requests/${request.leaveRequestId}/reject`, { reason: values.reason }),
    onSuccess: onSaved,
  })

  const { errors, isSubmitting } = form.formState

  return (
    <Modal open title={t('employees.reject')} onClose={onClose}>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Field label={t('employees.reason')} htmlFor="reject-reason" error={errors.reason?.message}>
          <Textarea id="reject-reason" rows={3} maxLength={300} {...form.register('reason')} />
        </Field>
        {mutation.error ? <p className="text-sm text-red-600">{errorMessage(mutation.error, t)}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {t('employees.reject')}
          </Button>
        </div>
      </form>
    </Modal>
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
