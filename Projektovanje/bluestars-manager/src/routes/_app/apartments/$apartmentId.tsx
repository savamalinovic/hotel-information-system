import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { apiDelete, apiFetch, apiGet, apiPost, apiPut } from '../../../lib/api/client'
import { errorMessage, errorViolations } from '../../../lib/api/errorMessage'
import type {
  ApartmentDetailsResponse,
  ApartmentOperationalStatus,
  ApartmentStatusHistoryResponse,
  ApartmentStatusRequest,
  ApartmentUnavailabilityRequest,
  ApartmentUnavailabilityResponse,
} from '../../../lib/api/types'
import { formatDate, formatInstant } from '../../../lib/format/date'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { Field } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { Badge, StatusBadge } from '../../../components/ui/Badge'
import { Money } from '../../../components/ui/Money'
import { ApartmentFormModal } from '../../../components/apartments/ApartmentFormModal'

const OPERATIONAL_STATUSES: ApartmentOperationalStatus[] = ['READY', 'DIRTY', 'CLEANING', 'MAINTENANCE']

export const Route = createFileRoute('/_app/apartments/$apartmentId')({
  component: ApartmentDetailPage,
})

function ApartmentDetailPage() {
  const { t } = useTranslation()
  const { apartmentId } = Route.useParams()
  const id = Number(apartmentId)
  const queryClient = useQueryClient()

  const apartment = useQuery({
    queryKey: ['apartment', id],
    queryFn: () => apiGet<ApartmentDetailsResponse>(`/apartments/${id}`),
  })

  const history = useQuery({
    queryKey: ['apartment', id, 'status-history'],
    queryFn: () => apiGet<ApartmentStatusHistoryResponse[]>(`/apartments/${id}/status-history`),
  })

  const unavailability = useQuery({
    queryKey: ['apartment', id, 'unavailability'],
    queryFn: () => apiGet<ApartmentUnavailabilityResponse[]>(`/apartments/${id}/unavailability`),
  })

  const [editing, setEditing] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [unavailabilityOpen, setUnavailabilityOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<ApartmentUnavailabilityResponse | null>(null)
  const [deletingPeriod, setDeletingPeriod] = useState<ApartmentUnavailabilityResponse | null>(null)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['apartment', id] })
    void queryClient.invalidateQueries({ queryKey: ['apartment', id, 'status-history'] })
    void queryClient.invalidateQueries({ queryKey: ['apartment', id, 'unavailability'] })
    void queryClient.invalidateQueries({ queryKey: ['apartments'] })
  }

  if (apartment.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    )
  }

  if (apartment.error || !apartment.data) {
    return (
      <ErrorState
        message={errorMessage(apartment.error, t)}
        action={
          <Button variant="secondary" onClick={() => apartment.refetch()}>
            {t('common.retry')}
          </Button>
        }
      />
    )
  }

  const data = apartment.data

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/apartments" className="text-sm text-blue-600 hover:underline">
            ← {t('apartments.title')}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">{data.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={data.effectiveStatus} />
          <Badge tone={data.active ? 'green' : 'gray'}>
            {t(data.active ? 'common.active' : 'common.inactive')}
          </Badge>
          <Button variant="secondary" onClick={() => setEditing(true)}>
            {t('common.edit')}
          </Button>
          <Button variant="secondary" onClick={() => setStatusOpen(true)}>
            {t('apartments.changeStatus')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title={t('apartments.title')}>
          <dl className="space-y-2 text-sm">
            <InfoRow label={t('apartments.address')} value={data.address} />
            <InfoRow label={t('apartments.floor')} value={String(data.floor)} />
            <InfoRow label={t('apartments.type')} value={data.type.name} />
            <InfoRow label={t('apartments.status')} value={data.operationalStatus} />
            <InfoRow label={t('apartments.capacity')} value={String(data.type.capacity)} />
            <InfoRow label={t('apartments.defaultNightlyRate')} value={data.type.defaultNightlyRate} money />
          </dl>
        </Card>

        <Card title={t('apartments.statusHistory')}>
          {history.isLoading ? (
            <Spinner />
          ) : history.data && history.data.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {history.data.map((entry) => (
                <li key={entry.apartmentStatusHistoryId} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <StatusBadge value={entry.status} />
                    {entry.reason ? <span className="text-gray-500">{entry.reason}</span> : null}
                  </span>
                  <span className="text-xs text-gray-400">{formatInstant(entry.changedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message={t('common.noResults')} />
          )}
        </Card>
      </div>

      <Card title={t('apartments.pictures')}>
        <div className="space-y-3">
          <div>
            <label className="block">
              <span className="sr-only">{t('apartments.upload')}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => handleFiles(event, id, refresh)}
                className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
              />
            </label>
          </div>
          {data.pictures.length === 0 ? (
            <EmptyState message={t('apartments.noPictures')} />
          ) : (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {data.pictures.map((picture, index) => (
                <li key={picture.pictureId} className="group relative overflow-hidden rounded-lg border border-gray-200">
                  <img src={picture.url} alt={data.name} className="h-32 w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-2 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => movePicture(index, -1, data.pictures, id, refresh)}
                      disabled={index === 0}
                      className="text-white disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => movePicture(index, 1, data.pictures, id, refresh)}
                      disabled={index === data.pictures.length - 1}
                      className="text-white disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => void deletePicture(id, picture.pictureId).then(refresh)}
                      className="text-white"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card title={t('apartments.unavailability')}>
        <div className="space-y-3">
          <Button onClick={() => setUnavailabilityOpen(true)}>{t('apartments.addUnavailability')}</Button>
          {unavailability.isLoading ? (
            <Spinner />
          ) : unavailability.data && unavailability.data.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {unavailability.data.map((period) => (
                <li key={period.apartmentUnavailabilityId} className="flex items-center justify-between gap-3 rounded-md bg-gray-50 p-3">
                  <div>
                    <div className="font-medium text-gray-800">
                      {formatDate(period.startDate)} — {formatDate(period.endDate)}
                    </div>
                    <div className="text-gray-500">{period.reason}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingPeriod(period)
                        setUnavailabilityOpen(true)
                      }}
                    >
                      {t('common.edit')}
                    </Button>
                    <Button variant="ghost" onClick={() => setDeletingPeriod(period)}>
                      {t('common.delete')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message={t('common.noResults')} />
          )}
        </div>
      </Card>

      <ApartmentFormModal
        open={editing}
        title={t('apartments.edit')}
        initial={data}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false)
          refresh()
        }}
      />

      <StatusFormModal
        open={statusOpen}
        apartmentId={id}
        current={data.operationalStatus}
        onClose={() => setStatusOpen(false)}
        onSaved={() => {
          setStatusOpen(false)
          refresh()
        }}
      />

      <UnavailabilityFormModal
        open={unavailabilityOpen}
        apartmentId={id}
        initial={editingPeriod}
        onClose={() => {
          setUnavailabilityOpen(false)
          setEditingPeriod(null)
        }}
        onSaved={() => {
          setUnavailabilityOpen(false)
          setEditingPeriod(null)
          refresh()
        }}
      />

      <ConfirmDialog
        open={deletingPeriod !== null}
        title={t('common.delete')}
        message={t('apartments.deleteUnavailabilityConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setDeletingPeriod(null)}
        onConfirm={() => {
          if (!deletingPeriod) return
          void apiDelete(`/apartments/${id}/unavailability/${deletingPeriod.apartmentUnavailabilityId}`).then(() => {
            setDeletingPeriod(null)
            refresh()
          })
        }}
      />
    </div>
  )
}

function InfoRow({ label, value, money = false }: { label: string; value: string; money?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{money ? <Money value={value} /> : value}</dd>
    </div>
  )
}

function handleFiles(event: ChangeEvent<HTMLInputElement>, id: number, refresh: () => void) {
  const files = Array.from(event.target.files ?? [])
  for (const file of files) {
    const formData = new FormData()
    formData.append('picture', file)
    void apiFetch(`/apartments/${id}/pictures`, { method: 'POST', formData }).then(refresh)
  }
  event.target.value = ''
}

async function deletePicture(id: number, pictureId: number) {
  await apiDelete(`/apartments/${id}/pictures/${pictureId}`)
}

function movePicture(
  index: number,
  direction: -1 | 1,
  pictures: ApartmentDetailsResponse['pictures'],
  id: number,
  refresh: () => void,
) {
  const target = index + direction
  if (target < 0 || target >= pictures.length) return
  const next = [...pictures]
  ;[next[index], next[target]] = [next[target], next[index]]
  void apiPut(`/apartments/${id}/pictures/order`, {
    pictureIds: next.map((picture) => picture.pictureId),
  }).then(refresh)
}

function StatusFormModal({
  open,
  apartmentId,
  current,
  onClose,
  onSaved,
}: {
  open: boolean
  apartmentId: number
  current: ApartmentOperationalStatus
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const schema = useMemo(
    () =>
      z.object({
        status: z.enum(OPERATIONAL_STATUSES),
        reason: z.string().min(1, t('apartments.reasonRequired')),
      }),
    [t],
  )
  type Values = z.infer<typeof schema>

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { status: current, reason: '' },
  })

  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const payload: ApartmentStatusRequest = { status: values.status, reason: values.reason }
      return apiPut(`/apartments/${apartmentId}/status`, payload)
    },
    onSuccess: onSaved,
  })

  const { errors, isSubmitting } = form.formState

  return (
    <Modal open={open} title={t('apartments.changeStatus')} onClose={onClose}>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Field label={t('apartments.status')} htmlFor="status">
          <Select id="status" {...form.register('status')}>
            {OPERATIONAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('apartments.reason')} htmlFor="status-reason" error={errors.reason?.message}>
          <Textarea id="status-reason" rows={3} {...form.register('reason')} />
        </Field>
        {mutation.error ? <p className="text-sm text-red-600">{errorMessage(mutation.error, t)}</p> : null}
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

function UnavailabilityFormModal({
  open,
  apartmentId,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean
  apartmentId: number
  initial: ApartmentUnavailabilityResponse | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const schema = useMemo(
    () =>
      z.object({
        startDate: z.string().min(1, t('reservations.checkInRequired')),
        endDate: z.string().min(1, t('reservations.checkOutRequired')),
        reason: z.string().min(1, t('apartments.reasonRequired')),
      }),
    [t],
  )
  type Values = z.infer<typeof schema>

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? { startDate: initial.startDate, endDate: initial.endDate, reason: initial.reason }
      : { startDate: '', endDate: '', reason: '' },
  })

  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const payload: ApartmentUnavailabilityRequest = {
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason,
      }
      if (initial) {
        return apiPut(`/apartments/${apartmentId}/unavailability/${initial.apartmentUnavailabilityId}`, payload)
      }
      return apiPost(`/apartments/${apartmentId}/unavailability`, payload)
    },
    onSuccess: onSaved,
  })

  const violations = errorViolations(mutation.error)
  const { errors, isSubmitting } = form.formState

  return (
    <Modal
      open={open}
      title={initial ? t('apartments.editUnavailability') : t('apartments.addUnavailability')}
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Field label={t('apartments.startDate')} htmlFor="un-start" error={errors.startDate?.message}>
          <Input id="un-start" type="date" {...form.register('startDate')} />
        </Field>
        <Field label={t('apartments.endDate')} htmlFor="un-end" error={errors.endDate?.message}>
          <Input id="un-end" type="date" {...form.register('endDate')} />
        </Field>
        <Field label={t('apartments.reason')} htmlFor="un-reason" error={errors.reason?.message}>
          <Textarea id="un-reason" rows={3} {...form.register('reason')} />
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
