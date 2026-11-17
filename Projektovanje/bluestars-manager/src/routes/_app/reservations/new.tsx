import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { apiGet, apiPost } from '../../../lib/api/client'
import { errorMessage, errorViolations } from '../../../lib/api/errorMessage'
import type {
  ApartmentDetailsResponse,
  AvailableApartmentResponse,
  CreateReservationRequest,
  Page,
  ReservationDetailsResponse,
} from '../../../lib/api/types'
import { Page as PageShell } from '../../../components/ui/Page'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { Field } from '../../../components/ui/Field'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Money } from '../../../components/ui/Money'

function makeCreateSchema(t: TFunction) {
  return z.object({
    apartmentId: z
      .string()
      .refine((value) => value !== '' && Number(value) > 0, t('reservations.apartmentRequired')),
    checkInDate: z.string().min(1, t('reservations.checkInRequired')),
    checkOutDate: z.string().min(1, t('reservations.checkOutRequired')),
    guestCount: z
      .string()
      .refine((value) => /^\d+$/.test(value) && Number(value) > 0, t('reservations.guestCountRequired')),
    nightlyRate: z.string().optional(),
    note: z.string().optional(),
  })
}

type CreateFormValues = z.infer<ReturnType<typeof makeCreateSchema>>

export const Route = createFileRoute('/_app/reservations/new')({
  component: NewReservationPage,
})

function NewReservationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const schema = useMemo(() => makeCreateSchema(t), [t])

  const apartmentsQuery = useQuery({
    queryKey: ['apartments', 'all'],
    queryFn: () => apiGet<Page<ApartmentDetailsResponse>>('/apartments', { size: 100 }),
    select: (data) => data.content,
  })

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      apartmentId: '',
      checkInDate: '',
      checkOutDate: '',
      guestCount: '1',
      nightlyRate: '',
      note: '',
    },
  })

  const checkInDate = form.watch('checkInDate')
  const checkOutDate = form.watch('checkOutDate')
  const guestCount = form.watch('guestCount')

  const availability = useQuery({
    queryKey: ['availability', checkInDate, checkOutDate, guestCount],
    queryFn: () =>
      apiGet<Page<AvailableApartmentResponse>>('/reservations/availability', {
        checkInDate,
        checkOutDate,
        guestCount,
        size: 50,
      }),
    enabled: Boolean(checkInDate && checkOutDate && guestCount),
  })

  const mutation = useMutation({
    mutationFn: async (values: CreateFormValues) => {
      const payload: CreateReservationRequest = {
        apartmentId: Number(values.apartmentId),
        checkInDate: values.checkInDate,
        checkOutDate: values.checkOutDate,
        guestCount: Number(values.guestCount),
        nightlyRate: values.nightlyRate || undefined,
        note: values.note || undefined,
      }
      return apiPost<ReservationDetailsResponse>('/reservations', payload)
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['reservations'] })
      void navigate({
        to: '/reservations/$reservationId',
        params: { reservationId: String(data.reservationId) },
      })
    },
  })

  const violations = errorViolations(mutation.error)
  const { errors, isSubmitting } = form.formState

  return (
    <PageShell title={t('reservations.newTitle')}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
            <Field label={t('reservations.apartment')} htmlFor="res-apartment" error={errors.apartmentId?.message}>
              <Select id="res-apartment" {...form.register('apartmentId')}>
                <option value="">{t('common.all')}</option>
                {(apartmentsQuery.data ?? []).map((apartment) => (
                  <option key={apartment.apartmentId} value={apartment.apartmentId}>
                    {apartment.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('reservations.checkInDate')} htmlFor="res-checkin" error={errors.checkInDate?.message}>
                <Input id="res-checkin" type="date" {...form.register('checkInDate')} />
              </Field>
              <Field label={t('reservations.checkOutDate')} htmlFor="res-checkout" error={errors.checkOutDate?.message}>
                <Input id="res-checkout" type="date" {...form.register('checkOutDate')} />
              </Field>
            </div>
            <Field label={t('reservations.guestCount')} htmlFor="res-guests" error={errors.guestCount?.message}>
              <Input id="res-guests" type="number" min={1} {...form.register('guestCount')} />
            </Field>
            <Field label={t('reservations.nightlyRate')} htmlFor="res-rate" error={errors.nightlyRate?.message}>
              <Input id="res-rate" inputMode="decimal" placeholder={t('common.optional')} {...form.register('nightlyRate')} />
            </Field>
            <Field label={t('reservations.note')} htmlFor="res-note">
              <Textarea id="res-note" rows={3} {...form.register('note')} />
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
              <Link to="/reservations">
                <Button type="button" variant="secondary" disabled={isSubmitting}>
                  {t('common.cancel')}
                </Button>
              </Link>
              <Button type="submit" loading={isSubmitting}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        </Card>

        <Card title={t('reservations.availability')}>
          {availability.data && availability.data.content.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {availability.data.content.map((apartment) => (
                <li key={apartment.apartmentId} className="flex items-center justify-between gap-3 rounded-md bg-gray-50 p-3">
                  <div>
                    <div className="font-medium text-gray-800">{apartment.name}</div>
                    <div className="text-gray-500">
                      {apartment.apartmentTypeName} · {t('apartments.capacity')}: {apartment.capacity}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Money value={apartment.defaultNightlyRate} />
                    <Button variant="secondary" onClick={() => form.setValue('apartmentId', String(apartment.apartmentId))}>
                      {t('common.confirm')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message={t('common.noResults')} />
          )}
        </Card>
      </div>
    </PageShell>
  )
}
