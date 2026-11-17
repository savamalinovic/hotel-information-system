import { apiFetch } from '../api/client'
import type { AppUserResponse, LoginResponse } from '../api/types'
import { clearSession, setSession, type Session } from './store'

export async function login(email: string, password: string): Promise<Session> {
  const response = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuthRedirect: true,
  })
  const session: Session = { token: response.token, email: response.email, role: response.role }
  setSession(session)
  return session
}

export function logout(): void {
  clearSession()
}

export function fetchMe(): Promise<AppUserResponse> {
  return apiFetch<AppUserResponse>('/users/me')
}
