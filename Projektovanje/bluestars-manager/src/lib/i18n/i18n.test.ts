import { afterEach, describe, expect, it } from 'vitest'
import i18n, { currentLocale, intlLocale } from './index'
import { enumLabel } from './enums'
import en from './locales/en'
import sr from './locales/sr'

function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key))
}

afterEach(async () => {
  await i18n.changeLanguage('sr')
})

describe('i18n', () => {
  it('uses Serbian as the default language', () => {
    expect(currentLocale()).toBe('sr')
    expect(intlLocale()).toBe('sr-Latn-BA')
    expect(i18n.t('nav.reservations')).toBe('Rezervacije')
  })

  it('keeps the Serbian and English locales in key parity', () => {
    expect(keyPaths(sr).sort()).toEqual(keyPaths(en).sort())
  })

  it('switches to English on demand', async () => {
    await i18n.changeLanguage('en')
    expect(currentLocale()).toBe('en')
    expect(i18n.t('nav.reservations')).toBe('Reservations')
  })
})

describe('enumLabel', () => {
  it('translates API enum values per domain', () => {
    expect(enumLabel(i18n.t, 'reservationStatus', 'CHECKED_IN')).toBe('Prijavljena')
    expect(enumLabel(i18n.t, 'reservationStatus', 'CANCELLED')).toBe('Otkazana')
    expect(enumLabel(i18n.t, 'taskStatus', 'CANCELLED')).toBe('Otkazan')
    expect(enumLabel(i18n.t, 'role', 'OPERATIONAL_WORKER')).toBe('Operativni radnik')
  })

  it('falls back to the raw value for unknown enum values', () => {
    expect(enumLabel(i18n.t, 'auditEvent', 'SOMETHING_NEW')).toBe('SOMETHING_NEW')
  })

  it('returns an empty string for missing values', () => {
    expect(enumLabel(i18n.t, 'taskStatus', null)).toBe('')
  })
})
