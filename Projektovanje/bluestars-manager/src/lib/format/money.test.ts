import { describe, expect, it } from 'vitest'
import { formatMoney, isDecimalString } from './money'

describe('formatMoney', () => {
  it('formats a valid decimal string without throwing', () => {
    const result = formatMoney('1234.5')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns the original value for invalid input', () => {
    expect(formatMoney('not-a-number')).toBe('not-a-number')
  })
})

describe('isDecimalString', () => {
  it('accepts valid decimal strings', () => {
    expect(isDecimalString('10')).toBe(true)
    expect(isDecimalString('10.99')).toBe(true)
  })

  it('rejects invalid strings', () => {
    expect(isDecimalString('')).toBe(false)
    expect(isDecimalString('abc')).toBe(false)
    expect(isDecimalString('10.999')).toBe(false)
    expect(isDecimalString('-5')).toBe(false)
  })
})
