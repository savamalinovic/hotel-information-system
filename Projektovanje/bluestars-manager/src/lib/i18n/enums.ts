import type { TFunction } from 'i18next'
import type en from './locales/en'

export type EnumKind = keyof typeof en.enums

export function enumLabel(t: TFunction, kind: EnumKind, value: string | null | undefined): string {
  if (!value) return ''
  return t(`enums.${kind}.${value}`, { defaultValue: value })
}
