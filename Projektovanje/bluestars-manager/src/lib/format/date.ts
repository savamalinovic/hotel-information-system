// Business dates are ISO LocalDate (YYYY-MM-DD) interpreted in Europe/Sarajevo.
// Audit timestamps are ISO Instants, also rendered in Europe/Sarajevo.
// LocalDate values are formatted as calendar dates (no time-zone day shift).

export const TIME_ZONE = 'Europe/Sarajevo'
const DATE_LOCALE = 'en-GB'

export function formatDate(isoLocalDate: string): string {
  const [year, month, day] = isoLocalDate.split('-').map((part) => Number(part))
  if (!year || !month || !day) return isoLocalDate
  const date = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatInstant(isoInstant: string): string {
  const date = new Date(isoInstant)
  if (Number.isNaN(date.getTime())) return isoInstant
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: TIME_ZONE,
  }).format(date)
}

function formatToLocalDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function todayLocal(): string {
  return formatToLocalDate(new Date())
}

export function daysAgoLocal(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return formatToLocalDate(date)
}
