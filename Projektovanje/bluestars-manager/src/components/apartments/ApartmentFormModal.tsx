import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { apiGet, apiPost, apiPut } from '../../lib/api/client'
import { errorMessage, errorViolations } from '../../lib/api/errorMessage'
import type {
  ApartmentDetailsResponse,
  ApartmentRequest,
  ApartmentTypeResponse,
  Page,
} from '../../lib/api/types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Field } from '../ui/Field'

function makeApartmentSchema(t: TFunction) {
  return z.object({
    name: z.string().min(1, t('apartments.nameRequired')),
    address: z.string().min(1, t('apartments.addressRequired')),
    floor: z.string().optional(),
    apartmentTypeId: z
      .string()
      .refine((value) => value !== '' && Number(value) > 0, t('apartments.typeRequired')),
  })
}

type ApartmentFormValues = z.infer<ReturnType<typeof makeApartmentSchema>>

export function ApartmentFormModal({
  open,
  title,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean
  title: string
  initial?: ApartmentDetailsResponse
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const schema = useMemo(() => makeApartmentSchema(t), [t])

  const typesQuery = useQuery({
    queryKey: ['apartment-types', 'all'],
    queryFn: () => apiGet<Page<ApartmentTypeResponse>>('/apartment-types', { size: 100 }),
    select: (data) => data.content,
  })

  const form = useForm<ApartmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          name: initial.name,
          address: initial.address,
          floor: String(initial.floor),
          apartmentTypeId: String(initial.type.apartmentTypeId),
        }
      : { name: '', address: '', floor: '', apartmentTypeId: '' },
  })

  const mutation = useMutation({
    mutationFn: async (values: ApartmentFormValues) => {
      const payload: ApartmentRequest = {
        name: values.name,
        address: values.address,
        floor: values.floor && values.floor !== '' ? Number(values.floor) : undefined,
        apartmentTypeId: Number(values.apartmentTypeId),
      }
      if (initial) {
        return apiPut<ApartmentDetailsResponse>(`/apartments/${initial.apartmentId}`, payload)
      }
      return apiPost<ApartmentDetailsResponse>('/apartments', payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['apartments'] })
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
        <Field label={t('apartments.name')} htmlFor="ap-name" error={errors.name?.message}>
          <Input id="ap-name" {...form.register('name')} />
        </Field>
        <Field label={t('apartments.address')} htmlFor="ap-address" error={errors.address?.message}>
          <Input id="ap-address" {...form.register('address')} />
        </Field>
        <Field label={t('apartments.floor')} htmlFor="ap-floor">
          <Input id="ap-floor" type="number" {...form.register('floor')} />
        </Field>
        <Field label={t('apartments.type')} htmlFor="ap-type" error={errors.apartmentTypeId?.message}>
          <Select id="ap-type" {...form.register('apartmentTypeId')}>
            <option value="">{t('common.all')}</option>
            {(typesQuery.data ?? []).map((type) => (
              <option key={type.apartmentTypeId} value={type.apartmentTypeId}>
                {type.name}
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
