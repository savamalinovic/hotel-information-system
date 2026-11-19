import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  INTL_LOCALES,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  resources,
  type AppLocale,
} from './locales'

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LOCALE,
  fallbackLng: FALLBACK_LOCALE,
  supportedLngs: [...SUPPORTED_LOCALES],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

export function currentLocale(): AppLocale {
  const language = i18n.resolvedLanguage ?? i18n.language
  return isSupportedLocale(language) ? language : DEFAULT_LOCALE
}

// Locale tag for Intl formatters, following the active UI language.
export function intlLocale(): string {
  return INTL_LOCALES[currentLocale()]
}

export default i18n
export { DEFAULT_LOCALE, SUPPORTED_LOCALES, isSupportedLocale }
export type { AppLocale }
