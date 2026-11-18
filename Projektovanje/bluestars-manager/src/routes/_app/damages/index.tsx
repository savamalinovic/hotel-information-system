import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { apiFetch, apiGet, apiPost, apiPut } from '../../../lib/api/client'
import { errorMessage, errorViolations } from '../../../lib/api/errorMessage'
import type {
  ApartmentDetailsResponse,
  CreateDamageRequest,
  DamageAttachmentResponse,
  DamageResponse,
  Page,
  UpdateDamageRequest,
} from '../../../lib/api/types'
import { numberParam, pageParam, sizeParam } from '../../../lib/query/search'
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
import { Money } from '../../../components/ui/Money'

function makeDamageSchema(t: TFunction) {
  const amount = z
    .string()
    .optional()
    .refine(
      (value) => value === undefined || value === '' || /^\d+(\.\d{1,2})?$/.test(value),
      t('damages.amountInvalid'),
    )
  return z.object({
    title: z.string().min(1, t('damages.titleRequired')),
    description: z.string().min(1, t('damages.descriptionRequired')),
    estimatedAmount: amount,
    confirmedAmount: amount,
  })
}

type DamageFormValues = z.infer<ReturnType<typeof makeDamageSchema>>

const searchSchema = z.object({
  page: pageParam,
  size: sizeParam,
  apartmentId: numberParam,
})

export const Route = createFileRoute('/_app/damages/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: DamagesPage,
})

function DamagesPage() {
  const { t } = useTranslation()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const apartmentId = search.apartmentId

  const apartments = useQuery({
    queryKey: ['apartments', 'all'],
    queryFn: () => apiGet<Page<ApartmentDetailsResponse>>('/apartments', { size: 100 }),
    select: (data) => data.content,
  })

  const list = useList<DamageResponse>({
    key: 'damages',
    path: `/apartments/${apartmentId}/damages`,
    query: { page: search.page ?? 0, size: search.size ?? 20 },
    enabled: apartmentId !== undefined,
  })

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<DamageResponse | null>(null)

  const columns = useMemo<Array<Column<DamageResponse>>>(
    () => [
      { key: 'title', header: t('damages.damageTitle'), render: (row) => row.title },
      { key: 'estimated', header: t('damages.estimatedAmount'), render: (row) => <Money value={row.estimatedAmount} /> },
      { key: 'confirmed', header: t('damages.confirmedAmount'), render: (row) => <Money value={row.confirmedAmount} /> },
      { key: 'author', header: t('expenses.author'), render: (row) => `${row.authorName} ${row.authorSurname}` },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (row) => (
          <Button variant="ghost" onClick={() => setEditing(row)}>
            {t('common.edit')}
          </Button>
        ),
      },
    ],
    [t],
  )

  return (
    <PageShell
      title={t('damages.title')}
      actions={
        <Button disabled={apartmentId === undefined} onClick={() => setCreating(true)}>
          {t('damages.create')}
        </Button>
      }
    >
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <FilterField label={t('damages.apartment')}>
          <Select
            value={apartmentId ?? ''}
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
      </div>

      {apartmentId === undefined ? (
        <EmptyState message={t('damages.apartment')} />
      ) : list.isLoading ? (
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
          <Table columns={columns} rows={list.data.content} rowKey={(row) => row.damageId} />
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

      {apartmentId !== undefined ? (
        <DamageFormModal
          open={creating || editing !== null}
          title={editing ? t('damages.edit') : t('damages.create')}
          apartmentId={apartmentId}
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
      ) : null}
    </PageShell>
  )
}

function DamageFormModal({
  open,
  title,
  apartmentId,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean
  title: string
  apartmentId: number
  initial: DamageResponse | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const schema = useMemo(() => makeDamageSchema(t), [t])

  const form = useForm<DamageFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          title: initial.title,
          description: initial.description,
          estimatedAmount: initial.estimatedAmount,
          confirmedAmount: initial.confirmedAmount,
        }
      : { title: '', description: '', estimatedAmount: '', confirmedAmount: '' },
  })

  const mutation = useMutation({
    mutationFn: async (values: DamageFormValues) => {
      const payload: CreateDamageRequest | UpdateDamageRequest = {
        title: values.title,
        description: values.description,
        estimatedAmount: values.estimatedAmount || undefined,
        confirmedAmount: values.confirmedAmount || undefined,
      }
      if (initial) {
        return apiPut<DamageResponse>(`/apartments/${apartmentId}/damages/${initial.damageId}`, payload)
      }
      return apiPost<DamageResponse>(`/apartments/${apartmentId}/damages`, payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['damages'] })
      onSaved()
    },
  })

  const violations = errorViolations(mutation.error)
  const { errors, isSubmitting } = form.formState

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Field label={t('damages.damageTitle')} htmlFor="d-title" error={errors.title?.message}>
          <Input id="d-title" {...form.register('title')} />
        </Field>
        <Field label={t('damages.description')} htmlFor="d-desc" error={errors.description?.message}>
          <Textarea id="d-desc" rows={3} {...form.register('description')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('damages.estimatedAmount')} htmlFor="d-estimated" error={errors.estimatedAmount?.message}>
            <Input id="d-estimated" inputMode="decimal" {...form.register('estimatedAmount')} />
          </Field>
          <Field label={t('damages.confirmedAmount')} htmlFor="d-confirmed" error={errors.confirmedAmount?.message}>
            <Input id="d-confirmed" inputMode="decimal" {...form.register('confirmedAmount')} />
          </Field>
        </div>

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

      {initial ? (
        <DamageAttachments apartmentId={apartmentId} damageId={initial.damageId} />
      ) : null}
    </Modal>
  )
}

function DamageAttachments({ apartmentId, damageId }: { apartmentId: number; damageId: number }) {
  const { t } = useTranslation()

  const attachments = useQuery({
    queryKey: ['damages', apartmentId, damageId, 'attachments'],
    queryFn: () =>
      apiGet<DamageAttachmentResponse[]>(`/apartments/${apartmentId}/damages/${damageId}/attachments`),
  })

  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      <h3 className="text-sm font-medium text-gray-700">{t('damages.attachments')}</h3>
      <div className="mt-2 space-y-3">
        <input
          type="file"
          onChange={(event) => handleFile(event, apartmentId, damageId, () => attachments.refetch())}
          className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
        />
        {attachments.data && attachments.data.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {attachments.data.map((attachment) => (
              <li key={attachment.damageAttachmentId} className="flex items-center justify-between gap-2">
                <a href={attachment.downloadUrl} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                  {attachment.originalName}
                </a>
                <span className="text-xs text-gray-400">{attachment.sizeBytes} B</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message={t('damages.noAttachments')} />
        )}
      </div>
    </div>
  )
}

function handleFile(event: ChangeEvent<HTMLInputElement>, apartmentId: number, damageId: number, refresh: () => void) {
  const files = Array.from(event.target.files ?? [])
  for (const file of files) {
    const formData = new FormData()
    formData.append('file', file)
    void apiFetch(`/apartments/${apartmentId}/damages/${damageId}/attachments`, { method: 'POST', formData }).then(refresh)
  }
  event.target.value = ''
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-40">
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  )
}
