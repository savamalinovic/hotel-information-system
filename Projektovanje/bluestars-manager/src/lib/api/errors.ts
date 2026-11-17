import type { ApiErrorBody, ApiFieldViolation, ErrorCode } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly violations: ApiFieldViolation[]
  readonly path?: string

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    violations: ApiFieldViolation[] = [],
    path?: string,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.violations = violations
    this.path = path
  }

  static fromResponse(status: number, data: unknown, path: string): ApiError {
    const body = (data && typeof data === 'object' ? data : {}) as Partial<ApiErrorBody>
    const code: ErrorCode = body.code ?? defaultCode(status)
    const message = body.message ?? defaultMessage(status)
    const violations = Array.isArray(body.violations) ? body.violations : []
    return new ApiError(status, code, message, violations, body.path ?? path)
  }

  fieldViolations(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const violation of this.violations) {
      result[violation.field] = violation.message
    }
    return result
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

function defaultCode(status: number): ErrorCode {
  switch (status) {
    case 401:
      return 'AUTHENTICATION_REQUIRED'
    case 403:
      return 'ACCESS_DENIED'
    case 404:
      return 'RESOURCE_NOT_FOUND'
    case 409:
      return 'RESOURCE_CONFLICT'
    default:
      return 'INTERNAL_ERROR'
  }
}

function defaultMessage(status: number): string {
  switch (status) {
    case 401:
      return 'Authentication required.'
    case 403:
      return 'Access denied.'
    case 404:
      return 'Resource not found.'
    case 409:
      return 'Conflict.'
    default:
      return 'Unexpected error.'
  }
}
