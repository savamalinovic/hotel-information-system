import type { Role } from '../api/types'

export interface Session {
  token: string
  email: string
  role: Role
}

const STORAGE_KEY = 'bluestars.auth'

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Session>
    if (!parsed || typeof parsed.token !== 'string' || typeof parsed.role !== 'string') {
      return null
    }
    return { token: parsed.token, email: parsed.email ?? '', role: parsed.role as Role }
  } catch {
    return null
  }
}

export function setSession(session: Session): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}
