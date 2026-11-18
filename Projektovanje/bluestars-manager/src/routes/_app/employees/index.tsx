import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { apiGet, apiPatch, apiPost, apiPut } from '../../../lib/api/client'
import { errorMessage, errorViolations } from '../../../lib/api/errorMessage'
import type {
  AssignSpecializationsRequest,
  CreateManagedUserRequest,
  ManagedUserResponse,
  Role,
  SpecializationResponse,
  UpdateManagedUserRequest,
} from '../../../lib/api/types'
import { booleanParam, pageParam, sizeParam, stringParam } from '../../../lib/query/search'
import { useList } from '../../../lib/query/useList'
import { Page } from '../../../components/ui/Page'
import { Table, type Column } from '../../../components/ui/Table'
import { Pagination } from '../../../components/ui/Pagination'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Field } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { Badge } from '../../../components/ui/Badge'

const ROLES = ['MANAGER', 'AGENT', 'OPERATIONAL_WORKER'] as const

function makeUserSchema(t: TFunction, isCreate: boolean) {
  return z
    .object({
      email: z.string().email(t('employees.emailInvalid')),
      name: z.string().min(2, t('employees.nameRequired')),
      surname: z.string().min(2, t('employees.surnameRequired')),
      jmbg: z.string().regex(/^\d{13}$/, t('employees.jmbgInvalid')),
      address: z.string().min(5, t('employees.addressRequired')),
      phoneNumber: z.string().optional(),
      role: z.enum(ROLES),
      password: z.string().optional(),
    })
    .refine((data) => !isCreate || (data.password ?? '').length >= 8, {
      message: t('employees.passwordTooShort'),
      path: ['password'],
    })
}

type UserFormValues = z.infer<ReturnType<typeof makeUserSchema>>

const searchSchema = z.object({
  page: pageParam,
  size: sizeParam,
  role: stringParam,
  active: booleanParam,
})

export const Route = createFileRoute('/_app/employees/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: EmployeesPage,
})

function EmployeesPage() {
  const { t } = useTranslation()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const queryClient = useQueryClient()

  const list = useList<ManagedUserResponse>({
    key: 'users',
    path: '/users',
    query: {
      page: search.page ?? 0,
      size: search.size ?? 20,
      role: search.role,
      active: search.active === 'true' ? true : search.active === 'false' ? false : undefined,
    },
  })

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ManagedUserResponse | null>(null)
  const [specializing, setSpecializing] = useState<ManagedUserResponse | null>(null)
  const [deactivating, setDeactivating] = useState<ManagedUserResponse | null>(null)

  const statusMutation = useMutation({
    mutationFn: ({ userId, active }: { userId: number; active: boolean }) =>
      apiPatch(`/users/${userId}/status`, { active }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeactivating(null)
    },
  })

  const columns = useMemo<Array<Column<ManagedUserResponse>>>(
    () => [
      {
        key: 'name',
        header: t('employees.name'),
        render: (row) => `${row.name} ${row.surname}`,
      },
      { key: 'email', header: t('employees.email'), render: (row) => row.email },
      { key: 'role', header: t('employees.role'), render: (row) => <Badge tone="blue">{row.role}</Badge> },
      {
        key: 'active',
        header: t('employees.active'),
        render: (row) => (
          <Badge tone={row.active ? 'green' : 'gray'}>
            {t(row.active ? 'common.active' : 'common.inactive')}
          </Badge>
        ),
      },
      {
        key: 'specializations',
        header: t('employees.specializations'),
        render: (row) =>
          row.specializations.length > 0
            ? row.specializations.map((spec) => spec.name).join(', ')
            : t('employees.noSpecializations'),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            <Button variant="ghost" onClick={() => setEditing(row)}>
              {t('common.edit')}
            </Button>
            <Button variant="ghost" onClick={() => setSpecializing(row)}>
              {t('employees.assignSpecializations')}
            </Button>
            {row.active ? (
              <Button variant="ghost" onClick={() => setDeactivating(row)}>
                {t('employees.deactivate')}
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => statusMutation.mutate({ userId: row.id, active: true })}>
                {t('employees.activate')}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [t, statusMutation],
  )

  return (
    <Page
      title={t('employees.title')}
      actions={
        <>
          <Link to="/employees/availability">
            <Button variant="secondary">{t('employees.availability')}</Button>
          </Link>
          <Link to="/employees/leave-requests">
            <Button variant="secondary">{t('employees.leaveRequests')}</Button>
          </Link>
          <Button onClick={() => setCreating(true)}>{t('employees.createUser')}</Button>
        </>
      }
    >
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <FilterField label={t('employees.role')}>
          <Select
            value={search.role ?? ''}
            onChange={(event) =>
              navigate({ search: { ...search, role: event.target.value || undefined, page: 0 } })
            }
          >
            <option value="">{t('common.all')}</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label={t('employees.active')}>
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
      </div>

      {statusMutation.error ? (
        <ErrorState message={errorMessage(statusMutation.error, t)} />
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
          <Table columns={columns} rows={list.data.content} rowKey={(row) => row.id} />
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

      <UserFormModal
        open={creating || editing !== null}
        title={editing ? t('employees.editUser') : t('employees.createUser')}
        initial={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        onSaved={() => {
          setCreating(false)
          setEditing(null)
          void list.refetch()
        }}
      />

      {specializing ? (
        <SpecializationsModal
          user={specializing}
          onClose={() => setSpecializing(null)}
          onSaved={() => {
            setSpecializing(null)
            void list.refetch()
          }}
        />
      ) : null}

      <ConfirmDialog
        open={deactivating !== null}
        title={t('employees.deactivate')}
        message={deactivating ? `${deactivating.name} ${deactivating.surname} — ${t('common.deleteConfirm')}` : undefined}
        confirmLabel={t('employees.deactivate')}
        cancelLabel={t('common.cancel')}
        loading={statusMutation.isPending}
        onCancel={() => setDeactivating(null)}
        onConfirm={() => {
          if (deactivating) statusMutation.mutate({ userId: deactivating.id, active: false })
        }}
      />
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

function UserFormModal({
  open,
  title,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean
  title: string
  initial: ManagedUserResponse | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const schema = useMemo(() => makeUserSchema(t, initial === null), [t, initial])

  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          email: initial.email,
          name: initial.name,
          surname: initial.surname,
          jmbg: initial.jmbg,
          address: initial.address,
          phoneNumber: initial.phoneNumber,
          role: initial.role as Role,
        }
      : {
          email: '',
          password: '',
          name: '',
          surname: '',
          jmbg: '',
          address: '',
          phoneNumber: '',
          role: 'AGENT' as Role,
        },
  })

  const mutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      if (initial) {
        const payload: UpdateManagedUserRequest = {
          email: values.email,
          name: values.name,
          surname: values.surname,
          jmbg: values.jmbg,
          address: values.address,
          phoneNumber: values.phoneNumber || undefined,
          role: values.role,
        }
        return apiPut<ManagedUserResponse>(`/users/${initial.id}`, payload)
      }
      const payload: CreateManagedUserRequest = {
        email: values.email,
        password: values.password ?? '',
        name: values.name,
        surname: values.surname,
        jmbg: values.jmbg,
        address: values.address,
        phoneNumber: values.phoneNumber || undefined,
        role: values.role,
      }
      return apiPost<ManagedUserResponse>('/users', payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      onSaved()
    },
  })

  const violations = errorViolations(mutation.error)
  const { errors, isSubmitting } = form.formState

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Field label={t('employees.email')} htmlFor="u-email" error={errors.email?.message}>
          <Input id="u-email" type="email" autoComplete="email" {...form.register('email')} />
        </Field>
        {initial === null ? (
          <Field label={t('employees.password')} htmlFor="u-password" error={errors.password?.message}>
            <Input id="u-password" type="password" autoComplete="new-password" {...form.register('password')} />
          </Field>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('employees.name')} htmlFor="u-name" error={errors.name?.message}>
            <Input id="u-name" {...form.register('name')} />
          </Field>
          <Field label={t('employees.surname')} htmlFor="u-surname" error={errors.surname?.message}>
            <Input id="u-surname" {...form.register('surname')} />
          </Field>
        </div>
        <Field label={t('employees.jmbg')} htmlFor="u-jmbg" error={errors.jmbg?.message}>
          <Input id="u-jmbg" inputMode="numeric" maxLength={13} {...form.register('jmbg')} />
        </Field>
        <Field label={t('employees.address')} htmlFor="u-address" error={errors.address?.message}>
          <Input id="u-address" {...form.register('address')} />
        </Field>
        <Field label={t('employees.phoneNumber')} htmlFor="u-phone">
          <Input id="u-phone" {...form.register('phoneNumber')} />
        </Field>
        <Field label={t('employees.role')} htmlFor="u-role" error={errors.role?.message}>
          <Select id="u-role" {...form.register('role')}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
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

function SpecializationsModal({
  user,
  onClose,
  onSaved,
}: {
  user: ManagedUserResponse
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const specializations = useQuery({
    queryKey: ['specializations'],
    queryFn: () => apiGet<SpecializationResponse[]>('/specializations'),
  })

  const [selected, setSelected] = useState<number[]>(() =>
    user.specializations.map((spec) => spec.id),
  )

  const mutation = useMutation({
    mutationFn: (specializationIds: number[]) =>
      apiPut(`/users/${user.id}/specializations`, { specializationIds } satisfies AssignSpecializationsRequest),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      onSaved()
    },
  })

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <Modal open title={t('employees.assignSpecializations')} onClose={onClose}>
      <div className="space-y-3">
        {specializations.data && specializations.data.length > 0 ? (
          <ul className="space-y-1">
            {specializations.data.map((spec) => (
              <li key={spec.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(spec.id)}
                    onChange={() => toggle(spec.id)}
                    className="rounded border-gray-300"
                  />
                  {spec.name}
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message={t('employees.noSpecializations')} />
        )}
        {mutation.error ? <p className="text-sm text-red-600">{errorMessage(mutation.error, t)}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate(selected)}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
