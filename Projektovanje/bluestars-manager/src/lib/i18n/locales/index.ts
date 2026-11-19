import en from './en'
import sr from './sr'

// Single source of truth for the default locale and the supported set.
export const DEFAULT_LOCALE = 'sr'
export const FALLBACK_LOCALE = 'en'
export const SUPPORTED_LOCALES = ['sr', 'en'] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const resources = {
  sr: { translation: sr },
  en: { translation: en },
} as const

export const INTL_LOCALES: Record<AppLocale, string> = {
  sr: 'sr-Latn-BA',
  en: 'en-GB',
}

export function isSupportedLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}
