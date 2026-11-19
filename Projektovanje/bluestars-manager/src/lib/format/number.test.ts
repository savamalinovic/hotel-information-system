import { afterEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { formatNumber, formatPercent } from './number'

afterEach(async () => {
  await i18n.changeLanguage('sr')
})

describe('formatPercent', () => {
  it('uses a decimal comma in Serbian', () => {
    expect(formatPercent(45.25)).toMatch(/^45,3\s?%$/)
  })

  it('uses a decimal point in English', async () => {
    await i18n.changeLanguage('en')
    expect(formatPercent(45.25)).toBe('45.3%')
  })

  it('returns the input for non-finite values', () => {
    expect(formatPercent(Number.NaN)).toBe('NaN')
  })
})

describe('formatNumber', () => {
  it('formats with Serbian separators', () => {
    expect(formatNumber(42.5)).toBe('42,5')
  })
})
