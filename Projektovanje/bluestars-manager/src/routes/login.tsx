import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useAuth } from '../lib/auth/AuthContext'
import { getSession } from '../lib/auth/store'
import { errorMessage } from '../lib/api/errorMessage'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Field } from '../components/ui/Field'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useRestoreStoredLocale } from '../lib/i18n/preference'

function makeLoginSchema(t: TFunction) {
  return z.object({
    email: z.email(t('auth.emailInvalid')),
    password: z.string().min(8, t('auth.passwordTooShort')),
  })
}

type LoginFormValues = z.infer<ReturnType<typeof makeLoginSchema>>

function sanitizeRedirect(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: sanitizeRedirect(search.redirect),
  }),
  beforeLoad: ({ search }) => {
    if (getSession()?.role === 'MANAGER') {
      throw redirect({ to: search.redirect })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const { t } = useTranslation()
  const { session, ready, login } = useAuth()
  const navigate = useNavigate()
  const { redirect: redirectTo } = Route.useSearch()
  const [serverError, setServerError] = useState<string | null>(null)
  useRestoreStoredLocale()
  const loginSchema = useMemo(() => makeLoginSchema(t), [t])

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  useEffect(() => {
    const invalidFields = Object.keys(errors) as Array<keyof LoginFormValues>
    if (invalidFields.length > 0) void trigger(invalidFields)
  }, [loginSchema])

  useEffect(() => {
    if (ready && session?.role === 'MANAGER') {
      void navigate({ to: redirectTo })
    }
  }, [ready, session, navigate, redirectTo])

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      await login(values.email, values.password)
    } catch (error) {
      setServerError(errorMessage(error, t))
    }
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900">{t('common.appName')}</h1>
          <LanguageSwitcher />
        </div>
        <p className="mt-1 text-sm text-gray-500">{t('auth.signInSubtitle')}</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <Field label={t('auth.email')} htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t('auth.emailPlaceholder')}
              {...register('email')}
            />
          </Field>
          <Field label={t('auth.password')} htmlFor="password" error={errors.password?.message}>
            <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
          </Field>
          {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}
          <Button type="submit" loading={isSubmitting} className="w-full">
            {t('auth.signIn')}
          </Button>
        </form>
      </div>
    </div>
  )
}
