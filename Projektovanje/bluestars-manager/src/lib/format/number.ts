import { intlLocale } from '../i18n'

// Renders a 0–100 percentage (as returned by the analytics API) with one
// decimal place, using the active UI language's separators.
export function formatPercent(percentage: number): string {
  if (!Number.isFinite(percentage)) return String(percentage)
  return new Intl.NumberFormat(intlLocale(), {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(percentage / 100)
}

// Plain number with the active UI language's separators (e.g. 42,5 in Serbian).
export function formatNumber(value: number, maximumFractionDigits = 1): string {
  if (!Number.isFinite(value)) return String(value)
  return new Intl.NumberFormat(intlLocale(), { maximumFractionDigits }).format(value)
}
