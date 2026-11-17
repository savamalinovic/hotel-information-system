import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, setOnUnauthorized } from './client'
import { ApiError } from './errors'
import { clearSession, getSession, setSession } from '../auth/store'

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  })
}

describe('apiFetch', () => {
  beforeEach(() => {
    clearSession()
    setOnUnauthorized(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('attaches the bearer token from the session', async () => {
    setSession({ token: 'tok123', email: 'manager@example.com', role: 'MANAGER' })
    const fetchMock = mockFetch(200, { ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/analytics')

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok123')
  })

  it('clears the session and throws ApiError on 401', async () => {
    setSession({ token: 'tok', email: 'manager@example.com', role: 'MANAGER' })
    vi.stubGlobal('fetch', mockFetch(401, { status: 401, code: 'AUTHENTICATION_REQUIRED', message: 'nope' }))

    await expect(apiFetch('/analytics')).rejects.toBeInstanceOf(ApiError)
    expect(getSession()).toBeNull()
  })
})
