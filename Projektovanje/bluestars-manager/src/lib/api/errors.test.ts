import { describe, expect, it } from 'vitest'
import { ApiError, isApiError } from './errors'

describe('ApiError', () => {
  it('maps a validation error envelope', () => {
    const error = ApiError.fromResponse(
      400,
      {
        status: 400,
        code: 'VALIDATION_FAILED',
        message: 'Invalid.',
        violations: [{ field: 'email', message: 'Email invalid' }],
      },
      '/auth/login',
    )
    expect(error.status).toBe(400)
    expect(error.code).toBe('VALIDATION_FAILED')
    expect(error.fieldViolations()).toEqual({ email: 'Email invalid' })
  })

  it('falls back to a default code for unknown errors', () => {
    const error = ApiError.fromResponse(500, {}, '/x')
    expect(error.code).toBe('INTERNAL_ERROR')
  })

  it('isApiError recognizes ApiError instances', () => {
    expect(isApiError(new ApiError(500, 'INTERNAL_ERROR', 'x'))).toBe(true)
    expect(isApiError(new Error('x'))).toBe(false)
  })
})
