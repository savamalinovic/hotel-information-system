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
    } catch {
      // Storage can be unavailable (private mode, blocked site data); the
      // choice still applies for this session.
    }
  }
  void i18n.changeLanguage(locale)
}

// Applies a previously chosen language. The server always renders the default
// locale, so this must only run once the visible markup has hydrated.
export function restoreStoredLocale(): void {
  const stored = readStoredLocale()
  if (stored && stored !== currentLocale()) void i18n.changeLanguage(stored)
}

// Call from top-level route components (login, app layout), not from the root
// shell: React commits the shell before the router's Suspense boundaries
// hydrate, and switching the language at that point makes the route markup
// mismatch the server-rendered HTML. A route's own effect runs only after that
// route has hydrated.
export function useRestoreStoredLocale(): void {
  useEffect(() => {
    restoreStoredLocale()
  }, [])
}
