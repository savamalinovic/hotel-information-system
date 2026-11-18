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

// Converts a naive local datetime 'YYYY-MM-DDTHH:mm' (wall-clock time in the
// given IANA time zone) to an ISO 8601 Instant string. Used to translate
// <input type="datetime-local"> values into the Instant filter the audit API
// expects. No business arithmetic — just an input/format boundary.
export function localDateTimeToInstant(local: string, timeZone: string = TIME_ZONE): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/.exec(local)
  if (!match) return local
  const [, year, month, day, hour, minute] = match
  const naiveUtcMs = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
  const offsetMs = timeZoneOffsetMs(naiveUtcMs, timeZone)
  return new Date(naiveUtcMs - offsetMs).toISOString()
}

function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const parts: Record<string, string> = {}
  for (const part of dtf.formatToParts(new Date(utcMs))) parts[part.type] = part.value
  const asUtcMs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  )
  return asUtcMs - utcMs
}
