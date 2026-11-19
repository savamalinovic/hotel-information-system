import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { enumLabel } from '../../../lib/i18n/enums'
import { apiGet, apiPatch } from '../../../lib/api/client'
import { errorMessage } from '../../../lib/api/errorMessage'
import type {
  ChangeReservationStatusRequest,
  CheckInClaimHistoryResponse,
  PaymentResponse,
  PaymentSummaryResponse,
  ReservationDetailsResponse,
  ReservationGuestResponse,
  ReservationStatus,
  ReservationStatusHistoryResponse,
  UpdateReservationStayRequest,
} from '../../../lib/api/types'
import { formatDate, formatInstant } from '../../../lib/format/date'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { Field } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { Badge, StatusBadge } from '../../../components/ui/Badge'
import { Money } from '../../../components/ui/Money'

const MANAGER_STATUS_CHOICES: ReservationStatus[] = ['CANCELLED', 'NO_SHOW']

export const Route = createFileRoute('/_app/reservations/$reservationId')({
  component: ReservationDetailPage,
})

function ReservationDetailPage() {
  const { t } = useTranslation()
  const { reservationId } = Route.useParams()
  const id = Number(reservationId)
  const queryClient = useQueryClient()

  const reservation = useQuery({
    queryKey: ['reservation', id],
    queryFn: () => apiGet<ReservationDetailsResponse>(`/reservations/${id}`),
  })

  const guests = useQuery({
    queryKey: ['reservation', id, 'guests'],
    queryFn: () => apiGet<ReservationGuestResponse[]>(`/reservations/${id}/guests`),
  })

  const payments = useQuery({
    queryKey: ['reservation', id, 'payments'],
    queryFn: () => apiGet<PaymentResponse[]>(`/reservations/${id}/payments`),
  })

  const paymentSummary = useQuery({
    queryKey: ['reservation', id, 'payments', 'summary'],
    queryFn: () => apiGet<PaymentSummaryResponse>(`/reservations/${id}/payments/summary`),
  })

  const statusHistory = useQuery({
    queryKey: ['reservation', id, 'status-history'],
    queryFn: () => apiGet<ReservationStatusHistoryResponse[]>(`/reservations/${id}/status-history`),
  })

  const claimHistory = useQuery({
    queryKey: ['reservation', id, 'claim-history'],
    queryFn: () => apiGet<CheckInClaimHistoryResponse[]>(`/reservations/${id}/check-in/claim-history`),
  })

  const [stayOpen, setStayOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['reservation', id] })
    void queryClient.invalidateQueries({ queryKey: ['reservation', id, 'status-history'] })
    void queryClient.invalidateQueries({ queryKey: ['reservations'] })
  }

  if (reservation.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    )
  }

  if (reservation.error || !reservation.data) {
    return (
      <ErrorState
        message={errorMessage(reservation.error, t)}
        action={
          <Button variant="secondary" onClick={() => reservation.refetch()}>
            {t('common.retry')}
          </Button>
        }
      />
    )
  }

  const data = reservation.data

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/reservations" className="text-sm text-blue-600 hover:underline">
            ← {t('reservations.title')}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">
            {data.apartmentName} · {formatDate(data.checkInDate)} — {formatDate(data.checkOutDate)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge kind="reservationStatus" value={data.status} />
          <Button variant="secondary" onClick={() => setStayOpen(true)}>
            {t('reservations.editStay')}
          </Button>
          <Button variant="secondary" onClick={() => setStatusOpen(true)}>
            {t('reservations.changeStatus')}
          </Button>
        </div>
      </div>

      <Card>
        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <InfoRow label={t('reservations.nights')} value={String(data.nights)} />
          <InfoRow label={t('reservations.guestCount')} value={String(data.guestCount)} />
          <InfoRow label={t('reservations.nightlyRate')} value={data.nightlyRate} money />
          <InfoRow label={t('reservations.totalPrice')} value={data.totalPrice} money />
        </dl>
        {data.note ? <p className="mt-3 text-sm text-gray-600">{data.note}</p> : null}
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title={t('reservations.guests')}>
          {guests.data && guests.data.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {guests.data.map((item) => (
                <li key={item.reservationGuestId} className="flex items-center justify-between gap-2">
                  <span>
                    {item.guest.name} {item.guest.surname}
                  </span>
                  {item.primaryGuest ? <Badge tone="blue">{t('reservations.primaryGuest')}</Badge> : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message={t('reservations.noGuests')} />
          )}
        </Card>

        <Card title={t('reservations.paymentSummary')}>
          {paymentSummary.data ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('reservations.totalDue')}</span>
                <Money value={paymentSummary.data.totalDue} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('reservations.netPaid')}</span>
                <Money value={paymentSummary.data.netPaid} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('reservations.outstandingBalance')}</span>
                <Money value={paymentSummary.data.outstandingBalance} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('reservations.status')}</span>
                <StatusBadge kind="paymentStatus" value={paymentSummary.data.status} />
              </div>
            </div>
          ) : (
            <EmptyState message={t('common.noResults')} />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title={t('reservations.payments')}>
          {payments.data && payments.data.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {payments.data.map((payment) => (
                <li key={payment.paymentId} className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-gray-800">
                      {enumLabel(t, 'paymentType', payment.type)} · <Money value={payment.amount} />
                    </div>
                    <div className="text-xs text-gray-400">{formatInstant(payment.recordedAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message={t('reservations.noPayments')} />
          )}
        </Card>

        <Card title={t('reservations.statusHistory')}>
          {statusHistory.data && statusHistory.data.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {statusHistory.data.map((entry) => (
                <li key={entry.reservationStatusHistoryId} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <StatusBadge kind="reservationStatus" value={entry.status} />
                    {entry.reason ? <span className="text-gray-500">{entry.reason}</span> : null}
                  </span>
                  <span className="text-xs text-gray-400">{formatInstant(entry.changedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message={t('reservations.noHistory')} />
          )}
        </Card>
      </div>

      <Card title={t('reservations.claimHistory')}>
        {claimHistory.data && claimHistory.data.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {claimHistory.data.map((entry) => (
              <li key={entry.historyId} className="flex items-center justify-between gap-2">
                <span>{enumLabel(t, 'claimAction', entry.action)}</span>
                <span className="text-xs text-gray-400">{formatInstant(entry.performedAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message={t('reservations.noHistory')} />
        )}
      </Card>

      <StayFormModal
        open={stayOpen}
        reservationId={id}
        current={data.checkOutDate}
        onClose={() => setStayOpen(false)}
        onSaved={() => {
          setStayOpen(false)
          refresh()
        }}
      />

      <StatusFormModal
        open={statusOpen}
        reservationId={id}
        onClose={() => setStatusOpen(false)}
        onSaved={() => {
          setStatusOpen(false)
          refresh()
        }}
      />
    </div>
  )
}

function InfoRow({ label, value, money = false }: { label: string; value: string; money?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-gray-900">{money ? <Money value={value} /> : value}</dd>
    </div>
  )
}

function StayFormModal({
  open,
  reservationId,
  current,
  onClose,
  onSaved,
}: {
  open: boolean
  reservationId: number
  current: string
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const schema = useMemo(
    () => z.object({ checkOutDate: z.string().min(1, t('reservations.checkOutRequired')) }),
    [t],
  )
  type Values = z.infer<typeof schema>

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { checkOutDate: current } })

  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const payload: UpdateReservationStayRequest = { checkOutDate: values.checkOutDate }
      return apiPatch<ReservationDetailsResponse>(`/reservations/${reservationId}/stay`, payload)
    },
    onSuccess: onSaved,
  })

  const { errors, isSubmitting } = form.formState

  return (
    <Modal open={open} title={t('reservations.editStay')} onClose={onClose}>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Field label={t('reservations.checkOutDate')} htmlFor="stay-checkout" error={errors.checkOutDate?.message}>
          <Input id="stay-checkout" type="date" {...form.register('checkOutDate')} />
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

function StatusFormModal({
  open,
  reservationId,
  onClose,
  onSaved,
}: {
  open: boolean
  reservationId: number
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const schema = useMemo(
    () =>
      z.object({
        status: z.enum(MANAGER_STATUS_CHOICES),
        reason: z.string().min(1, t('reservations.reasonRequired')),
      }),
    [t],
  )
  type Values = z.infer<typeof schema>

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'CANCELLED', reason: '' },
  })

  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const payload: ChangeReservationStatusRequest = { status: values.status, reason: values.reason }
      return apiPatch<ReservationDetailsResponse>(`/reservations/${reservationId}/status`, payload)
    },
    onSuccess: onSaved,
  })

  const { errors, isSubmitting } = form.formState

  return (
    <Modal open={open} title={t('reservations.changeStatus')} onClose={onClose}>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Field label={t('reservations.status')} htmlFor="res-status">
          <Select id="res-status" {...form.register('status')}>
            {MANAGER_STATUS_CHOICES.map((status) => (
              <option key={status} value={status}>
                {enumLabel(t, 'reservationStatus', status)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('reservations.reason')} htmlFor="res-reason" error={errors.reason?.message}>
          <Textarea id="res-reason" rows={3} {...form.register('reason')} />
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
