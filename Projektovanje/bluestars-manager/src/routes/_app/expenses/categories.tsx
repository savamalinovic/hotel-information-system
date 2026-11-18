import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { apiPost, apiPut } from '../../../lib/api/client'
import { errorMessage, errorViolations } from '../../../lib/api/errorMessage'
import type { CreateExpenseCategoryRequest, ExpenseCategoryResponse, UpdateExpenseCategoryRequest } from '../../../lib/api/types'
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
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { Badge } from '../../../components/ui/Badge'

function makeCategorySchema(t: TFunction) {
  return z.object({
    name: z.string().min(1, t('expenses.nameRequired')),
    description: z.string().optional(),
    active: z.boolean().optional(),
  })
}

type CategoryFormValues = z.infer<ReturnType<typeof makeCategorySchema>>

const searchSchema = z.object({ page: pageParam, size: sizeParam })

export const Route = createFileRoute('/_app/expenses/categories')({
  validateSearch: (search) => searchSchema.parse(search),
  component: CategoriesPage,
})

function CategoriesPage() {
  const { t } = useTranslation()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  const list = useList<ExpenseCategoryResponse>({
    key: 'expense-categories',
    path: '/expense-categories',
    query: { page: search.page ?? 0, size: search.size ?? 20 },
  })

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ExpenseCategoryResponse | null>(null)

  const columns = useMemo<Array<Column<ExpenseCategoryResponse>>>(
    () => [
      { key: 'name', header: t('expenses.name'), render: (row) => row.name },
      { key: 'description', header: t('expenses.description'), render: (row) => row.description || '—' },
      {
        key: 'active',
        header: t('common.active'),
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
          <Button variant="ghost" onClick={() => setEditing(row)}>
            {t('common.edit')}
          </Button>
        ),
      },
    ],
    [t],
  )

  return (
    <Page
      title={t('expenses.categories')}
      actions={<Button onClick={() => setCreating(true)}>{t('expenses.createCategory')}</Button>}
    >
      <Link to="/expenses" className="text-sm text-blue-600 hover:underline">
        ← {t('expenses.title')}
      </Link>

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
          <Table columns={columns} rows={list.data.content} rowKey={(row) => row.expenseCategoryId} />
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

      <CategoryFormModal
        open={creating || editing !== null}
        title={editing ? t('expenses.editCategory') : t('expenses.createCategory')}
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
    </Page>
  )
}

function CategoryFormModal({
  open,
  title,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean
  title: string
  initial: ExpenseCategoryResponse | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const schema = useMemo(() => makeCategorySchema(t), [t])

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? { name: initial.name, description: initial.description, active: initial.active }
      : { name: '', description: '', active: true },
  })

  const mutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      if (initial) {
        const payload: UpdateExpenseCategoryRequest = {
          name: values.name,
          description: values.description || undefined,
          active: values.active ?? true,
        }
        return apiPut(`/expense-categories/${initial.expenseCategoryId}`, payload)
      }
      const payload: CreateExpenseCategoryRequest = {
        name: values.name,
        description: values.description || undefined,
      }
      return apiPost('/expense-categories', payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
      void queryClient.invalidateQueries({ queryKey: ['expenses'] })
      onSaved()
    },
  })

  const violations = errorViolations(mutation.error)
  const { errors, isSubmitting } = form.formState

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Field label={t('expenses.name')} htmlFor="c-name" error={errors.name?.message}>
          <Input id="c-name" {...form.register('name')} />
        </Field>
        <Field label={t('expenses.description')} htmlFor="c-desc">
          <Textarea id="c-desc" rows={3} {...form.register('description')} />
        </Field>
        {initial ? (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...form.register('active')} className="rounded border-gray-300" />
            {t('common.active')}
          </label>
        ) : null}

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
