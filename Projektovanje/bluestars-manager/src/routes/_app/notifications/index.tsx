import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { enumLabel } from '../../../lib/i18n/enums'
import { apiPost } from '../../../lib/api/client'
import { errorMessage } from '../../../lib/api/errorMessage'
import type { NotificationResponse } from '../../../lib/api/types'
import { booleanParam, pageParam, sizeParam } from '../../../lib/query/search'
import { useList } from '../../../lib/query/useList'
import { formatInstant } from '../../../lib/format/date'
import { Page as PageShell } from '../../../components/ui/Page'
import { Table, type Column } from '../../../components/ui/Table'
import { Pagination } from '../../../components/ui/Pagination'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { Badge } from '../../../components/ui/Badge'

const searchSchema = z.object({
  page: pageParam,
  size: sizeParam,
  unreadOnly: booleanParam,
})

export const Route = createFileRoute('/_app/notifications/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: NotificationsPage,
})

function NotificationsPage() {
  const { t } = useTranslation()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const queryClient = useQueryClient()

  const list = useList<NotificationResponse>({
    key: 'notifications',
    path: '/notifications',
    query: {
      page: search.page ?? 0,
      size: search.size ?? 20,
      unreadOnly: search.unreadOnly === 'true' ? true : undefined,
    },
  })

  const markRead = useMutation({
    mutationFn: (id: number) => apiPost(`/notifications/${id}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const columns = useMemo<Array<Column<NotificationResponse>>>(
    () => [
      {
        key: 'message',
        header: t('notifications.title'),
        render: (row) => (
          <div>
            <div className="font-medium text-gray-900">{row.title}</div>
            <div className="max-w-xs truncate text-sm text-gray-500" title={row.body}>
              {row.body}
            </div>
          </div>
        ),
      },
      {
        key: 'type',
        header: t('notifications.type'),
        render: (row) => <span className="text-gray-500">{enumLabel(t, 'notificationType', row.type)}</span>,
      },
      {
        key: 'created',
        header: t('notifications.time'),
        render: (row) => <span className="whitespace-nowrap text-gray-600">{formatInstant(row.createdAt)}</span>,
      },
      {
        key: 'task',
        header: t('notifications.task'),
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
        key: 'status',
        header: t('common.status'),
        render: (row) =>
          row.readAt === null ? (
            <Badge tone="amber">{t('notifications.unread')}</Badge>
          ) : (
            <Badge tone="gray">{t('notifications.read')}</Badge>
          ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (row) =>
          row.readAt === null ? (
            <Button
              variant="ghost"
              disabled={markRead.isPending && markRead.variables === row.notificationId}
              onClick={() => markRead.mutate(row.notificationId)}
            >
              {t('notifications.markRead')}
            </Button>
          ) : null,
      },
    ],
    [t, markRead],
  )

  return (
    <PageShell title={t('notifications.title')}>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={search.unreadOnly === 'true'}
            onChange={(event) =>
              navigate({
                search: {
                  ...search,
                  unreadOnly: event.target.checked ? 'true' : undefined,
                  page: 0,
                },
              })
            }
            className="rounded border-gray-300"
          />
          {t('notifications.unreadOnly')}
        </label>
      </div>

      {markRead.error ? <ErrorState message={errorMessage(markRead.error, t)} /> : null}

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
        <EmptyState message={t('notifications.noNotifications')} />
      ) : list.data ? (
        <>
          <Table columns={columns} rows={list.data.content} rowKey={(row) => row.notificationId} />
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
