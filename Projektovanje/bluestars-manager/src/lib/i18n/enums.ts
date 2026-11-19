import type { TFunction } from 'i18next'
import type en from './locales/en'

export type EnumKind = keyof typeof en.enums

// Translates a backend enum value (e.g. CHECKED_IN) for display. Values the
// locale does not know yet are shown as-is rather than as a missing key.
export function enumLabel(t: TFunction, kind: EnumKind, value: string | null | undefined): string {
  if (!value) return ''
  return t(`enums.${kind}.${value}`, { defaultValue: value })
}
