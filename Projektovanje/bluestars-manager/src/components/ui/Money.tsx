import { formatMoney } from '../../lib/format/money'

export function Money({ value, className = '' }: { value: string; className?: string }) {
  return <span className={className}>{formatMoney(value)}</span>
}
