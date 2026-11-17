import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth/AuthContext'
import { getSession } from '../lib/auth/store'
import { isApiError } from '../lib/api/errors'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Field } from '../components/ui/Field'

const loginSchema = z.object({
  email: z.email('Enter a valid email.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

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
      if (isApiError(error)) {
        setServerError(
          error.code === 'INVALID_CREDENTIALS' ? t('errors.INVALID_CREDENTIALS') : error.message,
        )
      } else {
        setServerError(t('errors.UNKNOWN'))
      }
    }
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">{t('common.appName')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('auth.signInSubtitle')}</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <Field label={t('auth.email')} htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
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
