import { describe, expect, it } from 'vitest'
import { formatDate, formatInstant } from './date'

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
