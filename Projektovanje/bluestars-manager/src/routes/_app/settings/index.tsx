import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { apiGet, apiPut } from '../../../lib/api/client'
import { errorMessage, errorViolations } from '../../../lib/api/errorMessage'
import type { HotelProfileResponse, UpdateHotelProfileRequest } from '../../../lib/api/types'
import { formatInstant } from '../../../lib/format/date'
import { Page as PageShell } from '../../../components/ui/Page'
import { Card } from '../../../components/ui/Card'
import { Field } from '../../../components/ui/Field'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { Spinner } from '../../../components/ui/Spinner'
import { ErrorState } from '../../../components/ui/ErrorState'

function makeProfileSchema(t: TFunction) {
  return z.object({
    name: z.string().min(1, t('settings.nameRequired')),
    legalName: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    countryCode: z.string().optional(),
    phoneNumber: z.string().optional(),
    email: z
      .string()
      .optional()
      .refine((value) => value === undefined || value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
        message: t('settings.emailInvalid'),
      }),
    taxId: z.string().optional(),
  })
}

type ProfileFormValues = z.infer<ReturnType<typeof makeProfileSchema>>

export const Route = createFileRoute('/_app/settings/')({
  component: SettingsPage,
})

function SettingsPage() {
  const { t } = useTranslation()

  const profile = useQuery({
    queryKey: ['hotel-profile'],
    queryFn: () => apiGet<HotelProfileResponse>('/hotel-profile'),
  })

  if (profile.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    )
  }

  if (profile.error || !profile.data) {
    return (
      <ErrorState
        message={errorMessage(profile.error, t)}
        action={
          <Button variant="secondary" onClick={() => profile.refetch()}>
            {t('common.retry')}
          </Button>
        }
      />
    )
  }

  return (
    <PageShell title={t('settings.title')}>
      <ProfileForm profile={profile.data} />
    </PageShell>
  )
}

function ProfileForm({ profile }: { profile: HotelProfileResponse }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const schema = useMemo(() => makeProfileSchema(t), [t])

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: profile.name,
      legalName: profile.legalName,
      address: profile.address,
      city: profile.city,
      countryCode: profile.countryCode,
      phoneNumber: profile.phoneNumber,
      email: profile.email,
      taxId: profile.taxId,
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const payload: UpdateHotelProfileRequest = {
        name: values.name,
        legalName: values.legalName || undefined,
        address: values.address || undefined,
        city: values.city || undefined,
        countryCode: values.countryCode || undefined,
        phoneNumber: values.phoneNumber || undefined,
        email: values.email || undefined,
        taxId: values.taxId || undefined,
      }
      return apiPut<HotelProfileResponse>('/hotel-profile', payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hotel-profile'] })
    },
  })

  const violations = errorViolations(mutation.error)
  const { errors, isSubmitting } = form.formState

  return (
    <Card>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Field label={t('settings.name')} htmlFor="p-name" error={errors.name?.message}>
          <Input id="p-name" {...form.register('name')} />
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t('settings.legalName')} htmlFor="p-legal">
            <Input id="p-legal" {...form.register('legalName')} />
          </Field>
          <Field label={t('settings.taxId')} htmlFor="p-tax">
            <Input id="p-tax" {...form.register('taxId')} />
          </Field>
          <Field label={t('settings.address')} htmlFor="p-address">
            <Input id="p-address" {...form.register('address')} />
          </Field>
          <Field label={t('settings.city')} htmlFor="p-city">
            <Input id="p-city" {...form.register('city')} />
          </Field>
          <Field label={t('settings.countryCode')} htmlFor="p-country">
            <Input id="p-country" {...form.register('countryCode')} />
          </Field>
          <Field label={t('settings.phoneNumber')} htmlFor="p-phone">
            <Input id="p-phone" {...form.register('phoneNumber')} />
          </Field>
          <Field label={t('settings.email')} htmlFor="p-email" error={errors.email?.message}>
            <Input id="p-email" type="email" autoComplete="email" {...form.register('email')} />
          </Field>
        </div>

        {profile.updatedAt ? (
          <p className="text-xs text-gray-400">
            {t('settings.updatedAt')}: {formatInstant(profile.updatedAt)}
          </p>
        ) : null}

        {mutation.isSuccess ? <p className="text-sm text-green-600">{t('settings.saved')}</p> : null}

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

        <div className="flex justify-end">
          <Button type="submit" loading={isSubmitting}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Card>
  )
}
