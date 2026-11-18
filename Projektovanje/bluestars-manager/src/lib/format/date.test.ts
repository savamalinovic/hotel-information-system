import { describe, expect, it } from 'vitest'
import { formatDate, formatInstant, localDateTimeToInstant } from './date'

describe('formatDate', () => {
  it('renders a LocalDate without shifting the day', () => {
    expect(formatDate('2026-11-17')).toContain('17')
  })

  it('returns the input for malformed dates', () => {
    expect(formatDate('nope')).toBe('nope')
  })
})

describe('formatInstant', () => {
  it('renders an ISO instant without throwing', () => {
    const result = formatInstant('2026-11-17T10:00:00Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns the input for malformed instants', () => {
    expect(formatInstant('nope')).toBe('nope')
  })
})

describe('localDateTimeToInstant', () => {
  it('converts a Sarajevo winter wall-clock time to an ISO instant', () => {
    // Europe/Sarajevo is UTC+1 in January.
    expect(localDateTimeToInstant('2026-01-15T12:00')).toBe('2026-01-15T11:00:00.000Z')
  })

  it('converts a Sarajevo summer wall-clock time to an ISO instant', () => {
    // Europe/Sarajevo is UTC+2 in July.
    expect(localDateTimeToInstant('2026-07-15T12:00')).toBe('2026-07-15T10:00:00.000Z')
  })

  it('returns the input for malformed values', () => {
    expect(localDateTimeToInstant('nope')).toBe('nope')
  })
})
