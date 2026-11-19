import { useEffect } from 'react'
import i18n, { currentLocale, isSupportedLocale, type AppLocale } from './index'

const STORAGE_KEY = 'bluestars.language'

export function readStoredLocale(): AppLocale | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return isSupportedLocale(value) ? value : null
  } catch {
    return null
  }
}

export function changeLocale(locale: AppLocale): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale)
    } catch {}
  }
  void i18n.changeLanguage(locale)
}

export function restoreStoredLocale(): void {
  const stored = readStoredLocale()
  if (stored && stored !== currentLocale()) void i18n.changeLanguage(stored)
}

export function useRestoreStoredLocale(): void {
  useEffect(() => {
    restoreStoredLocale()
  }, [])
}
