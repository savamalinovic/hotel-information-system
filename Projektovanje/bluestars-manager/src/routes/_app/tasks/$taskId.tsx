import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { enumLabel } from '../../../lib/i18n/enums'
import { apiFetch, apiGet, apiPost } from '../../../lib/api/client'
import { errorMessage } from '../../../lib/api/errorMessage'
import type {
  ApartmentDetailsResponse,
  ManagedUserResponse,
  Page,
  TaskAttachmentResponse,
  TaskHistoryResponse,
  TaskResponse,
} from '../../../lib/api/types'
import { formatInstant } from '../../../lib/format/date'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Textarea } from '../../../components/ui/Textarea'
import { Field } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { Badge, StatusBadge } from '../../../components/ui/Badge'

export const Route = createFileRoute('/_app/tasks/$taskId')({
  component: TaskDetailPage,
})

function TaskDetailPage() {
  const { t } = useTranslation()
  const { taskId } = Route.useParams()
  const id = Number(taskId)
  const queryClient = useQueryClient()

  const task = useQuery({
    queryKey: ['task', id],
    queryFn: () => apiGet<TaskResponse>(`/tasks/${id}`),
  })

  const history = useQuery({
    queryKey: ['task', id, 'history'],
    queryFn: () => apiGet<TaskHistoryResponse[]>(`/tasks/${id}/history`),
  })

  const attachments = useQuery({
    queryKey: ['task', id, 'attachments'],
    queryFn: () => apiGet<TaskAttachmentResponse[]>(`/tasks/${id}/attachments`),
  })

  const apartments = useQuery({
    queryKey: ['apartments', 'all'],
    queryFn: () => apiGet<Page<ApartmentDetailsResponse>>('/apartments', { size: 100 }),
    select: (data) => data.content,
  })

  const users = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => apiGet<Page<ManagedUserResponse>>('/users', { size: 100 }),
    select: (data) => data.content,
  })

  const [cancelOpen, setCancelOpen] = useState(false)

  if (task.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    )
  }

  if (task.error || !task.data) {
    return (
      <ErrorState
        message={errorMessage(task.error, t)}
        action={
          <Button variant="secondary" onClick={() => task.refetch()}>
            {t('common.retry')}
          </Button>
        }
      />
    )
  }

  const data = task.data
  const isCleaning = data.specializationCode.toLowerCase() === 'cleaning'
  const apartmentName =
    data.apartmentId !== null
      ? (apartments.data ?? []).find((a) => a.apartmentId === data.apartmentId)?.name ?? String(data.apartmentId)
      : undefined
  const workerName =
    data.assignedWorkerId !== null
      ? (users.data ?? []).find((u) => u.id === data.assignedWorkerId)?.name
      : undefined

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/tasks" className="text-sm text-blue-600 hover:underline">
            ← {t('tasks.title')}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">{data.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isCleaning ? <Badge tone="amber">{t('tasks.cleaning')}</Badge> : null}
          <StatusBadge kind="taskStatus" value={data.status} />
          {data.status !== 'CANCELLED' && data.status !== 'COMPLETED' ? (
            <Button variant="secondary" onClick={() => setCancelOpen(true)}>
              {t('tasks.cancel')}
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
          <InfoRow label={t('tasks.specialization')} value={enumLabel(t, 'specialization', data.specializationCode)} />
          <InfoRow label={t('tasks.priority')} value={enumLabel(t, 'taskPriority', data.priority)} />
          <InfoRow label={t('tasks.status')} value={enumLabel(t, 'taskStatus', data.status)} />
          <InfoRow label={t('tasks.apartment')} value={apartmentName ?? '—'} />
          <InfoRow label={t('tasks.reservation')} value={data.reservationId ? String(data.reservationId) : '—'} />
          <InfoRow label={t('tasks.assignedWorker')} value={workerName ?? '—'} />
        </dl>
        {data.description ? <p className="mt-3 text-sm text-gray-600">{data.description}</p> : null}
        <p className="mt-2 text-xs text-gray-400">
          {t('common.create')}: {formatInstant(data.createdAt)} · {t('common.edit')}: {formatInstant(data.updatedAt)}
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title={t('tasks.history')}>
          {history.data && history.data.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {history.data.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <StatusBadge kind="taskStatus" value={entry.toStatus} />
                    {entry.reason ? <span className="text-gray-500">{entry.reason}</span> : null}
                  </span>
                  <span className="text-xs text-gray-400">{formatInstant(entry.changedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message={t('tasks.noHistory')} />
          )}
        </Card>

        <Card title={t('tasks.attachments')}>
          <div className="space-y-3">
            <input
              type="file"
              onChange={(event) => handleFile(event, id, () => attachments.refetch())}
              className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
            />
            {attachments.data && attachments.data.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {attachments.data.map((attachment) => (
                  <li key={attachment.id} className="flex items-center justify-between gap-2">
                    <a href={attachment.downloadUrl} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                      {attachment.originalName}
                    </a>
                    <span className="text-xs text-gray-400">{attachment.sizeBytes} B</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message={t('tasks.noAttachments')} />
            )}
          </div>
        </Card>
      </div>

      <CancelModal
        open={cancelOpen}
        taskId={id}
        onClose={() => setCancelOpen(false)}
        onSaved={() => {
          setCancelOpen(false)
          void queryClient.invalidateQueries({ queryKey: ['task', id] })
          void queryClient.invalidateQueries({ queryKey: ['task', id, 'history'] })
          void queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }}
      />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-gray-900">{value}</dd>
    </div>
  )
}

function handleFile(event: ChangeEvent<HTMLInputElement>, id: number, refresh: () => void) {
  const files = Array.from(event.target.files ?? [])
  for (const file of files) {
    const formData = new FormData()
    formData.append('file', file)
    void apiFetch(`/tasks/${id}/attachments`, { method: 'POST', formData }).then(refresh)
  }
  event.target.value = ''
}

function CancelModal({
  open,
  taskId,
  onClose,
  onSaved,
}: {
  open: boolean
  taskId: number
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const schema = useMemo(() => z.object({ reason: z.string().min(1, t('tasks.reasonRequired')) }), [t])
  type Values = z.infer<typeof schema>

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { reason: '' } })

  const mutation = useMutation({
    mutationFn: (values: Values) => apiPost(`/tasks/${taskId}/cancel`, { reason: values.reason }),
    onSuccess: onSaved,
  })

  const { errors, isSubmitting } = form.formState

  return (
    <Modal open={open} title={t('tasks.cancel')} onClose={onClose}>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Field label={t('tasks.reason')} htmlFor="cancel-reason" error={errors.reason?.message}>
          <Textarea id="cancel-reason" rows={3} {...form.register('reason')} />
        </Field>
        {mutation.error ? <p className="text-sm text-red-600">{errorMessage(mutation.error, t)}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={isSubmitting} variant="danger">
            {t('tasks.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
