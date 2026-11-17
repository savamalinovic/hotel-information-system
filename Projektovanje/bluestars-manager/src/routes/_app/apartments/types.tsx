import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { apiDelete, apiPost, apiPut } from '../../../lib/api/client'
import { errorMessage, errorViolations } from '../../../lib/api/errorMessage'
import type { ApartmentTypeRequest, ApartmentTypeResponse } from '../../../lib/api/types'
import { pageParam, sizeParam } from '../../../lib/query/search'
import { useList } from '../../../lib/query/useList'
import { Page } from '../../../components/ui/Page'
import { Table, type Column } from '../../../components/ui/Table'
import { Pagination } from '../../../components/ui/Pagination'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui/Textarea'
import { Field } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { Badge } from '../../../components/ui/Badge'
import { Money } from '../../../components/ui/Money'

function makeTypeSchema(t: TFunction) {
  return z.object({
    name: z.string().min(1, t('apartments.nameRequired')),
    description: z.string().optional(),
    capacity: z
      .string()
      .refine((value) => /^\d+$/.test(value) && Number(value) > 0, t('apartments.capacityRequired')),
    defaultNightlyRate: z.string().regex(/^\d+(\.\d{1,2})?$/, t('apartments.rateInvalid')),
  })
}

type TypeFormValues = z.infer<ReturnType<typeof makeTypeSchema>>

const searchSchema = z.object({ page: pageParam, size: sizeParam })

export const Route = createFileRoute('/_app/apartments/types')({
  validateSearch: (search) => searchSchema.parse(search),
  component: TypesPage,
})

function TypesPage() {
  const { t } = useTranslation()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const list = useList<ApartmentTypeResponse>({
    key: 'apartment-types',
    path: '/apartment-types',
    query: { page: search.page ?? 0, size: search.size ?? 20 },
  })

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ApartmentTypeResponse | null>(null)
  const [deleting, setDeleting] = useState<ApartmentTypeResponse | null>(null)

  const columns = useMemo<Array<Column<ApartmentTypeResponse>>>(
    () => [
      { key: 'name', header: t('apartments.name'), render: (row) => row.name },
      { key: 'capacity', header: t('apartments.capacity'), render: (row) => row.capacity },
      {
        key: 'rate',
        header: t('apartments.defaultNightlyRate'),
        render: (row) => <Money value={row.defaultNightlyRate} />,
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
      {
        key: 'actions',
        header: t('common.actions'),
        render: (row) => (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditing(row)}>
              {t('common.edit')}
            </Button>
            <Button variant="ghost" onClick={() => setDeleting(row)}>
              {t('common.delete')}
            </Button>
          </div>
        ),
      },
    ],
    [t],
  )

  return (
    <Page
      title={t('apartments.typesTitle')}
      actions={<Button onClick={() => setCreating(true)}>{t('apartments.createType')}</Button>}
    >
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
          <Table columns={columns} rows={list.data.content} rowKey={(row) => row.apartmentTypeId} />
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

      <TypeFormModal
        open={creating || editing !== null}
        title={editing ? t('apartments.editType') : t('apartments.createType')}
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

      <ConfirmDialog
        open={deleting !== null}
        title={t('common.delete')}
        message={deleting ? `${deleting.name} — ${t('common.deleteConfirm')}` : undefined}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          void deleteType(deleting.apartmentTypeId).then(() => {
            setDeleting(null)
            void list.refetch()
          })
        }}
      />
    </Page>
  )
}

async function deleteType(id: number) {
  await apiDelete<unknown>(`/apartment-types/${id}`)
}

function TypeFormModal({
  open,
  title,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean
  title: string
  initial: ApartmentTypeResponse | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const schema = useMemo(() => makeTypeSchema(t), [t])

  const form = useForm<TypeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          name: initial.name,
          description: initial.description,
          capacity: String(initial.capacity),
          defaultNightlyRate: initial.defaultNightlyRate,
        }
      : { name: '', description: '', capacity: '1', defaultNightlyRate: '' },
  })

  const mutation = useMutation({
    mutationFn: async (values: TypeFormValues) => {
      const payload: ApartmentTypeRequest = {
        name: values.name,
        description: values.description || undefined,
        capacity: Number(values.capacity),
        defaultNightlyRate: values.defaultNightlyRate,
      }
      if (initial) {
        return apiPut<ApartmentTypeResponse>(`/apartment-types/${initial.apartmentTypeId}`, payload)
      }
      return apiPost<ApartmentTypeResponse>('/apartment-types', payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['apartment-types'] })
      onSaved()
    },
  })

  const violations = errorViolations(mutation.error)
  const { errors, isSubmitting } = form.formState

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        <Field label={t('apartments.name')} htmlFor="type-name" error={errors.name?.message}>
          <Input id="type-name" {...form.register('name')} />
        </Field>
        <Field label={t('apartments.capacity')} htmlFor="type-capacity" error={errors.capacity?.message}>
          <Input id="type-capacity" type="number" min={1} {...form.register('capacity')} />
        </Field>
        <Field
          label={t('apartments.defaultNightlyRate')}
          htmlFor="type-rate"
          error={errors.defaultNightlyRate?.message}
        >
          <Input id="type-rate" inputMode="decimal" {...form.register('defaultNightlyRate')} />
        </Field>
        <Field label={t('apartments.description')} htmlFor="type-description">
          <Textarea id="type-description" rows={3} {...form.register('description')} />
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
