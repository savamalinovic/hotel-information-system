import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession, getSession, setSession, type Session } from './store'

const session: Session = { token: 'abc', email: 'manager@example.com', role: 'MANAGER' }

describe('auth store', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('stores and reads a session', () => {
    setSession(session)
    expect(getSession()).toEqual(session)
  })

  it('clears a session', () => {
    setSession(session)
    clearSession()
    expect(getSession()).toBeNull()
  })

  it('returns null when nothing is stored', () => {
    expect(getSession()).toBeNull()
  })
})
