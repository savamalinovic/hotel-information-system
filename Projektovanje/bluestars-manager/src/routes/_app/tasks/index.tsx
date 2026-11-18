import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { apiGet, apiPost } from '../../../lib/api/client'
import { errorMessage, errorViolations } from '../../../lib/api/errorMessage'
import type {
  ApartmentDetailsResponse,
  CreateTaskRequest,
  ManagedUserResponse,
  Page,
  SpecializationResponse,
  TaskPriority,
  TaskResponse,
} from '../../../lib/api/types'
import { numberParam, pageParam, sizeParam, stringParam } from '../../../lib/query/search'
import { useList } from '../../../lib/query/useList'
import { Page as PageShell } from '../../../components/ui/Page'
import { Table, type Column } from '../../../components/ui/Table'
import { Pagination } from '../../../components/ui/Pagination'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { Field } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { StatusBadge } from '../../../components/ui/Badge'

const TASK_STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'] as const
const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT']

function makeTaskSchema(t: TFunction) {
  return z.object({
    specializationId: z
      .string()
      .refine((value) => value !== '' && Number(value) > 0, t('tasks.specializationRequired')),
    apartmentId: z.string().optional(),
    reservationId: z.string().optional(),
    title: z.string().min(1, t('tasks.titleRequired')),
    description: z.string().min(1, t('tasks.descriptionRequired')),
    priority: z.enum(TASK_PRIORITIES),
  })
}

type TaskFormValues = z.infer<ReturnType<typeof makeTaskSchema>>

const searchSchema = z.object({
  page: pageParam,
  size: sizeParam,
  status: stringParam,
  specializationId: numberParam,
  apartmentId: numberParam,
  reservationId: numberParam,
  assignedWorkerId: numberParam,
})

export const Route = createFileRoute('/_app/tasks/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: TasksPage,
})

function TasksPage() {
  const { t } = useTranslation()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  const list = useList<TaskResponse>({
    key: 'tasks',
    path: '/tasks',
    query: {
      page: search.page ?? 0,
      size: search.size ?? 20,
      status: search.status,
      specializationId: search.specializationId,
      apartmentId: search.apartmentId,
      reservationId: search.reservationId,
      assignedWorkerId: search.assignedWorkerId,
    },
  })

  const specializations = useQuery({
    queryKey: ['specializations'],
    queryFn: () => apiGet<SpecializationResponse[]>('/specializations'),
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

  const [creating, setCreating] = useState(false)

  const apartmentNames = useMemo(() => {
    const map = new Map<number, string>()
    for (const apartment of apartments.data ?? []) map.set(apartment.apartmentId, apartment.name)
    return map
  }, [apartments.data])

  const workerNames = useMemo(() => {
    const map = new Map<number, string>()
    for (const user of users.data ?? []) map.set(user.id, `${user.name} ${user.surname}`)
    return map
  }, [users.data])

  const columns = useMemo<Array<Column<TaskResponse>>>(
    () => [
      {
        key: 'title',
        header: t('tasks.taskTitle'),
        render: (row) => (
          <Link
            to="/tasks/$taskId"
            params={{ taskId: String(row.taskId) }}
            className="font-medium text-blue-600 hover:underline"
          >
            {row.title}
          </Link>
        ),
      },
      { key: 'specialization', header: t('tasks.specialization'), render: (row) => row.specializationCode },
      {
        key: 'apartment',
        header: t('tasks.apartment'),
        render: (row) =>
          row.apartmentId ? (apartmentNames.get(row.apartmentId) ?? String(row.apartmentId)) : '—',
      },
      {
        key: 'worker',
        header: t('tasks.assignedWorker'),
        render: (row) => (row.assignedWorkerId ? (workerNames.get(row.assignedWorkerId) ?? String(row.assignedWorkerId)) : '—'),
      },
      { key: 'status', header: t('tasks.status'), render: (row) => <StatusBadge value={row.status} /> },
      { key: 'priority', header: t('tasks.priority'), render: (row) => <StatusBadge value={row.priority} /> },
    ],
    [t, apartmentNames, workerNames],
  )

  return (
    <PageShell
      title={t('tasks.title')}
      actions={<Button onClick={() => setCreating(true)}>{t('tasks.createTask')}</Button>}
    >
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <FilterField label={t('tasks.status')}>
          <Select
            value={search.status ?? ''}
            onChange={(event) =>
              navigate({ search: { ...search, status: event.target.value || undefined, page: 0 } })
            }
          >
            <option value="">{t('common.all')}</option>
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label={t('tasks.specialization')}>
          <Select
            value={search.specializationId ?? ''}
            onChange={(event) =>
              navigate({
                search: {
                  ...search,
                  specializationId: event.target.value ? Number(event.target.value) : undefined,
                  page: 0,
                },
              })
            }
          >
            <option value="">{t('common.all')}</option>
            {(specializations.data ?? []).map((spec) => (
              <option key={spec.id} value={spec.id}>
                {spec.name}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label={t('tasks.apartment')}>
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
            {(apartments.data ?? []).map((apartment) => (
              <option key={apartment.apartmentId} value={apartment.apartmentId}>
                {apartment.name}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label={t('tasks.assignedWorker')}>
          <Select
            value={search.assignedWorkerId ?? ''}
            onChange={(event) =>
              navigate({
                search: {
                  ...search,
                  assignedWorkerId: event.target.value ? Number(event.target.value) : undefined,
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
          <Table columns={columns} rows={list.data.content} rowKey={(row) => row.taskId} />
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

      <TaskFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false)
          void list.refetch()
        }}
      />
    </PageShell>
  )
}

function TaskFormModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const schema = useMemo(() => makeTaskSchema(t), [t])

  const specializations = useQuery({
    queryKey: ['specializations'],
    queryFn: () => apiGet<SpecializationResponse[]>('/specializations'),
  })

  const apartments = useQuery({
    queryKey: ['apartments', 'all'],
    queryFn: () => apiGet<Page<ApartmentDetailsResponse>>('/apartments', { size: 100 }),
    select: (data) => data.content,
  })

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      specializationId: '',
      apartmentId: '',
      reservationId: '',
      title: '',
      description: '',
      priority: 'NORMAL',
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: TaskFormValues) => {
      const payload: CreateTaskRequest = {
        specializationId: Number(values.specializationId),
        apartmentId: values.apartmentId ? Number(values.apartmentId) : undefined,
        reservationId: values.reservationId ? Number(values.reservationId) : undefined,
        title: values.title,
        description: values.description,
        priority: values.priority,
      }
      return apiPost<TaskResponse>('/tasks', payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onSaved()
    },
  })

  const violations = errorViolations(mutation.error)
  const { errors, isSubmitting } = form.formState

  return (
    <Modal open={open} title={t('tasks.createTask')} onClose={onClose}>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Field label={t('tasks.specialization')} htmlFor="t-spec" error={errors.specializationId?.message}>
          <Select id="t-spec" {...form.register('specializationId')}>
            <option value="">{t('common.all')}</option>
            {(specializations.data ?? []).map((spec) => (
              <option key={spec.id} value={spec.id}>
                {spec.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('tasks.taskTitle')} htmlFor="t-title" error={errors.title?.message}>
          <Input id="t-title" {...form.register('title')} />
        </Field>
        <Field label={t('tasks.description')} htmlFor="t-desc" error={errors.description?.message}>
          <Textarea id="t-desc" rows={3} {...form.register('description')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('tasks.priority')} htmlFor="t-priority" error={errors.priority?.message}>
            <Select id="t-priority" {...form.register('priority')}>
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('tasks.apartment')} htmlFor="t-apartment">
            <Select id="t-apartment" {...form.register('apartmentId')}>
              <option value="">{t('common.all')}</option>
              {(apartments.data ?? []).map((apartment) => (
                <option key={apartment.apartmentId} value={apartment.apartmentId}>
                  {apartment.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t('tasks.reservation')} htmlFor="t-reservation">
          <Input id="t-reservation" type="number" min={1} {...form.register('reservationId')} />
        </Field>

        {mutation.error ? (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            <p>{errorMessage(mutation.error, t)}</p>
            {violations.length > 0 ? (
              <ul className="mt-1 list-disc pl-5">
                {violations.map((v) => (
                  <li key={v.field}>
                    {v.field}: {v.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {t('common.save')}
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
