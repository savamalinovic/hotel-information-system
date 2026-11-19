import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { enumLabel, type EnumKind } from '../../lib/i18n/enums'

export type BadgeTone = 'gray' | 'green' | 'red' | 'amber' | 'blue' | 'purple'

const TONE_CLASSES: Record<BadgeTone, string> = {
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
}

export function Badge({ tone = 'gray', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  )
}

const STATUS_TONES: Record<string, BadgeTone> = {
  READY: 'green',
  DIRTY: 'amber',
  CLEANING: 'blue',
  MAINTENANCE: 'purple',
  OUT_OF_ORDER: 'red',
  CONFIRMED: 'blue',
  CHECKED_IN: 'green',
  CHECKED_OUT: 'gray',
  CANCELLED: 'gray',
  NO_SHOW: 'amber',
  NEW: 'gray',
  ASSIGNED: 'blue',
  IN_PROGRESS: 'amber',
  BLOCKED: 'red',
  COMPLETED: 'green',
  LOW: 'gray',
  NORMAL: 'blue',
  HIGH: 'amber',
  URGENT: 'red',
  PENDING: 'amber',
  APPROVED: 'green',
  REJECTED: 'red',
  AVAILABLE: 'green',
  BUSY: 'amber',
  OFF_DUTY: 'gray',
  UNAVAILABLE: 'red',
  ON_BREAK: 'blue',
  ON_LEAVE: 'purple',
  PAID: 'green',
  PARTIALLY_PAID: 'amber',
  UNPAID: 'red',
}

export function StatusBadge({ kind, value }: { kind: EnumKind; value: string }) {
  const { t } = useTranslation()
  return <Badge tone={STATUS_TONES[value] ?? 'gray'}>{enumLabel(t, kind, value)}</Badge>
}
