import type { Session } from './store'

export function isManager(session: Session | null): boolean {
  return session !== null && session.role === 'MANAGER'
}

export function requireManager(session: Session | null): boolean {
  return isManager(session)
}
