import type { TFunction } from 'i18next'
import { isApiError } from './errors'
import type { ApiError } from './errors'

const CODE_KEYS: Record<string, string> = {
  VALIDATION_FAILED: 'errors.VALIDATION_FAILED',
  AUTHENTICATION_REQUIRED: 'errors.AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS: 'errors.INVALID_CREDENTIALS',
  ACCESS_DENIED: 'errors.ACCESS_DENIED',
  RESOURCE_NOT_FOUND: 'errors.RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'errors.RESOURCE_CONFLICT',
  BUSINESS_RULE_VIOLATION: 'errors.BUSINESS_RULE_VIOLATION',
  DATA_INTEGRITY_CONFLICT: 'errors.DATA_INTEGRITY_CONFLICT',
  MALFORMED_REQUEST: 'errors.MALFORMED_REQUEST',
  UPSTREAM_SERVICE_ERROR: 'errors.UPSTREAM_SERVICE_ERROR',
  INTERNAL_ERROR: 'errors.INTERNAL_ERROR',
}

export function errorMessage(error: unknown, t: TFunction): string {
  if (isApiError(error)) {
    const key = CODE_KEYS[error.code]
    if (key) return t(key)
    return error.message || t('errors.UNKNOWN')
  }
  // fetch() rejects with a TypeError when the request never reaches the server.
  if (error instanceof TypeError) return t('errors.NETWORK')
  return t('errors.UNKNOWN')
}

export function errorViolations(error: unknown): ApiError['violations'] {
  return isApiError(error) ? error.violations : []
}
