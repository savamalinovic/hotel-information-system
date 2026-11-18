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
  CreateOperationalExpenseRequest,
  ExpenseCategoryResponse,
  OperationalExpenseResponse,
  Page,
} from '../../../lib/api/types'
import { booleanParam, numberParam, pageParam, sizeParam, stringParam } from '../../../lib/query/search'
import { useList } from '../../../lib/query/useList'
import { formatDate, formatInstant } from '../../../lib/format/date'
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
import { Badge } from '../../../components/ui/Badge'
import { Money } from '../../../components/ui/Money'

function makeExpenseSchema(t: TFunction) {
  return z.object({
    categoryId: z.string().refine((value) => value !== '' && Number(value) > 0, t('expenses.categoryRequired')),
    name: z.string().min(1, t('expenses.nameRequired')),
    description: z.string().optional(),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/, t('expenses.amountInvalid')),
    expenseDate: z.string().min(1, t('expenses.expenseDateRequired')),
  })
}

type ExpenseFormValues = z.infer<ReturnType<typeof makeExpenseSchema>>

const searchSchema = z.object({
  page: pageParam,
  size: sizeParam,
  dateFrom: stringParam,
  dateTo: stringParam,
  categoryId: numberParam,
  createdBy: numberParam,
  voided: booleanParam,
})

export const Route = createFileRoute('/_app/expenses/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: ExpensesPage,
})

function ExpensesPage() {
  const { t } = useTranslation()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  const list = useList<OperationalExpenseResponse>({
    key: 'expenses',
    path: '/expenses',
    query: {
      page: search.page ?? 0,
      size: search.size ?? 20,
      dateFrom: search.dateFrom,
      dateTo: search.dateTo,
      categoryId: search.categoryId,
      createdBy: search.createdBy,
      voided: search.voided === 'true' ? true : search.voided === 'false' ? false : undefined,
    },
  })

  const categories = useQuery({
    queryKey: ['expense-categories', 'all'],
    queryFn: () => apiGet<Page<ExpenseCategoryResponse>>('/expense-categories', { size: 100 }),
    select: (data) => data.content,
  })

  const [creating, setCreating] = useState(false)
  const [voiding, setVoiding] = useState<OperationalExpenseResponse | null>(null)

  const columns = useMemo<Array<Column<OperationalExpenseResponse>>>(
    () => [
      { key: 'name', header: t('expenses.name'), render: (row) => row.name },
      { key: 'category', header: t('expenses.category'), render: (row) => row.categoryName },
      { key: 'amount', header: t('expenses.amount'), render: (row) => <Money value={row.amount} /> },
      { key: 'date', header: t('expenses.expenseDate'), render: (row) => formatDate(row.expenseDate) },
      {
        key: 'voided',
        header: t('expenses.voided'),
        render: (row) =>
          row.voided ? (
            <Badge tone="gray">{t('expenses.voided')}</Badge>
          ) : (
            <Button variant="ghost" onClick={() => setVoiding(row)}>
              {t('expenses.void')}
            </Button>
          ),
      },
      {
        key: 'author',
        header: t('expenses.author'),
        render: (row) => `${row.authorName} ${row.authorSurname}`,
      },
    ],
    [t],
  )

  return (
    <PageShell
      title={t('expenses.title')}
      actions={
        <>
          <Link to="/expenses/categories">
            <Button variant="secondary">{t('expenses.categories')}</Button>
          </Link>
          <Button onClick={() => setCreating(true)}>{t('expenses.create')}</Button>
        </>
      }
    >
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <FilterField label={t('expenses.dateFrom')}>
          <Input
            type="date"
            value={search.dateFrom ?? ''}
            onChange={(event) =>
              navigate({ search: { ...search, dateFrom: event.target.value || undefined, page: 0 } })
            }
          />
        </FilterField>
        <FilterField label={t('expenses.dateTo')}>
          <Input
            type="date"
            value={search.dateTo ?? ''}
            onChange={(event) =>
              navigate({ search: { ...search, dateTo: event.target.value || undefined, page: 0 } })
            }
          />
        </FilterField>
        <FilterField label={t('expenses.category')}>
          <Select
            value={search.categoryId ?? ''}
            onChange={(event) =>
              navigate({
                search: {
                  ...search,
                  categoryId: event.target.value ? Number(event.target.value) : undefined,
                  page: 0,
                },
              })
            }
          >
            <option value="">{t('common.all')}</option>
            {(categories.data ?? []).map((category) => (
              <option key={category.expenseCategoryId} value={category.expenseCategoryId}>
                {category.name}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label={t('expenses.voided')}>
          <Select
            value={search.voided ?? ''}
            onChange={(event) =>
              navigate({
                search: {
                  ...search,
                  voided: event.target.value === '' ? undefined : (event.target.value as 'true' | 'false'),
                  page: 0,
                },
              })
            }
          >
            <option value="">{t('common.all')}</option>
            <option value="false">{t('common.no')}</option>
            <option value="true">{t('common.yes')}</option>
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
          <Table columns={columns} rows={list.data.content} rowKey={(row) => row.operationalExpenseId} />
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

      <ExpenseFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false)
          void list.refetch()
        }}
      />

      {voiding ? (
        <VoidModal
          expense={voiding}
          onClose={() => setVoiding(null)}
          onSaved={() => {
            setVoiding(null)
            void list.refetch()
          }}
        />
      ) : null}
    </PageShell>
  )
}

function ExpenseFormModal({
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
  const schema = useMemo(() => makeExpenseSchema(t), [t])

  const categories = useQuery({
    queryKey: ['expense-categories', 'all'],
    queryFn: () => apiGet<Page<ExpenseCategoryResponse>>('/expense-categories', { size: 100 }),
    select: (data) => data.content,
  })

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { categoryId: '', name: '', description: '', amount: '', expenseDate: '' },
  })

  const mutation = useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      const payload: CreateOperationalExpenseRequest = {
        categoryId: Number(values.categoryId),
        name: values.name,
        description: values.description || undefined,
        amount: values.amount,
        expenseDate: values.expenseDate,
      }
      return apiPost<OperationalExpenseResponse>('/expenses', payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] })
      onSaved()
    },
  })

  const violations = errorViolations(mutation.error)
  const { errors, isSubmitting } = form.formState

  return (
    <Modal open={open} title={t('expenses.create')} onClose={onClose}>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Field label={t('expenses.category')} htmlFor="e-category" error={errors.categoryId?.message}>
          <Select id="e-category" {...form.register('categoryId')}>
            <option value="">{t('common.all')}</option>
            {(categories.data ?? []).map((category) => (
              <option key={category.expenseCategoryId} value={category.expenseCategoryId}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('expenses.name')} htmlFor="e-name" error={errors.name?.message}>
          <Input id="e-name" {...form.register('name')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('expenses.amount')} htmlFor="e-amount" error={errors.amount?.message}>
            <Input id="e-amount" inputMode="decimal" {...form.register('amount')} />
          </Field>
          <Field label={t('expenses.expenseDate')} htmlFor="e-date" error={errors.expenseDate?.message}>
            <Input id="e-date" type="date" {...form.register('expenseDate')} />
          </Field>
        </div>
        <Field label={t('expenses.description')} htmlFor="e-desc">
          <Textarea id="e-desc" rows={3} {...form.register('description')} />
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

function VoidModal({
  expense,
  onClose,
  onSaved,
}: {
  expense: OperationalExpenseResponse
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const schema = useMemo(() => z.object({ reason: z.string().min(1, t('expenses.reasonRequired')) }), [t])
  type Values = z.infer<typeof schema>

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { reason: '' } })

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      apiPost(`/expenses/${expense.operationalExpenseId}/void`, { reason: values.reason }),
    onSuccess: onSaved,
  })

  const { errors, isSubmitting } = form.formState

  return (
    <Modal open title={t('expenses.void')} onClose={onClose}>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <p className="text-sm text-gray-600">
          {expense.name} · <Money value={expense.amount} /> · {formatInstant(expense.createdAt)}
        </p>
        <Field label={t('common.reason')} htmlFor="void-reason" error={errors.reason?.message}>
          <Textarea id="void-reason" rows={3} {...form.register('reason')} />
        </Field>
        {mutation.error ? <p className="text-sm text-red-600">{errorMessage(mutation.error, t)}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={isSubmitting} variant="danger">
            {t('expenses.void')}
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
