// Money is handled as a decimal string everywhere. The backend owns all
// business arithmetic; this module only formats for display and validates the
// shape before sending. No floating-point calculations are performed here.

const CURRENCY = 'BAM'
const MONEY_LOCALE = 'bs-BA'

export function formatMoney(value: string): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return value
  return new Intl.NumberFormat(MONEY_LOCALE, {
    style: 'currency',
    currency: CURRENCY,
  }).format(amount)
}

export function isDecimalString(value: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(value)
}
