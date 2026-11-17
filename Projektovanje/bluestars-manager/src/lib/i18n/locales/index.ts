import en from './en'

// Single source of truth for the default locale and the supported set.
// Adding Serbian is a one-line change here plus a `locales/sr.ts` file.
export const DEFAULT_LOCALE = 'en'
export const SUPPORTED_LOCALES = ['en'] as const

export const resources = {
  en: { translation: en },
} as const
