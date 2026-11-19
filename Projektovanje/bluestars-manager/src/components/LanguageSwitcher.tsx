import { useTranslation } from 'react-i18next'
import { SUPPORTED_LOCALES, isSupportedLocale } from '../lib/i18n'
import { changeLocale } from '../lib/i18n/preference'

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const value = isSupportedLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : SUPPORTED_LOCALES[0]

  return (
    <select
      aria-label={t('language.label')}
      value={value}
      onChange={(event) => {
        if (isSupportedLocale(event.target.value)) changeLocale(event.target.value)
      }}
      className={`rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
    >
      {SUPPORTED_LOCALES.map((locale) => (
        <option key={locale} value={locale}>
          {t(`language.${locale}`)}
        </option>
      ))}
    </select>
  )
}
