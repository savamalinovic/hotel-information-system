import { intlLocale } from '../i18n'

export function formatPercent(percentage: number): string {
  if (!Number.isFinite(percentage)) return String(percentage)
  return new Intl.NumberFormat(intlLocale(), {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(percentage / 100)
}

export function formatNumber(value: number, maximumFractionDigits = 1): string {
  if (!Number.isFinite(value)) return String(value)
  return new Intl.NumberFormat(intlLocale(), { maximumFractionDigits }).format(value)
}
