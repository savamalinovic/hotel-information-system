import { ApiError } from './errors'
import { clearSession, getSession } from '../auth/store'

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'https://hotel-information-system-production.up.railway.app/api/v1'

export type QueryValue = string | number | boolean | undefined | null

export interface ApiRequestOptions {
  method?: string
  body?: unknown
  query?: Record<string, QueryValue>
  formData?: FormData
  skipAuthRedirect?: boolean
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(API_BASE_URL + path)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

let onUnauthorized: () => void = () => {
  if (typeof window !== 'undefined') {
    window.location.assign('/login')
  }
}

export function setOnUnauthorized(handler: () => void): void {
  onUnauthorized = handler
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, formData, skipAuthRedirect } = options
  const url = buildUrl(path, query)
  const headers: Record<string, string> = {}
  const session = getSession()
  if (session?.token) headers.Authorization = `Bearer ${session.token}`

  let payload: BodyInit | undefined
  if (formData) {
    payload = formData
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const response = await fetch(url, { method, headers, body: payload })

  if (response.status === 401 && !skipAuthRedirect) {
    clearSession()
    onUnauthorized()
    throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Session expired. Please sign in again.')
  }

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    throw ApiError.fromResponse(response.status, data, path)
  }

  return data as T
}

export function apiGet<T>(path: string, query?: Record<string, QueryValue>): Promise<T> {
  return apiFetch<T>(path, { method: 'GET', query })
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body })
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PUT', body })
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', body })
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' })
}

export interface DownloadResult {
  blob: Blob
  filename: string
}

export async function apiDownload(
  path: string,
  query?: Record<string, QueryValue>,
): Promise<DownloadResult> {
  const url = buildUrl(path, query)
  const headers: Record<string, string> = {}
  const session = getSession()
  if (session?.token) headers.Authorization = `Bearer ${session.token}`

  const response = await fetch(url, { method: 'GET', headers })

  if (response.status === 401) {
    clearSession()
    onUnauthorized()
    throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Session expired. Please sign in again.')
  }

  if (!response.ok) {
    const text = await response.text()
    let data: unknown = null
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
    throw ApiError.fromResponse(response.status, data, path)
  }

  const blob = await response.blob()
  const filename = parseContentDisposition(response.headers.get('content-disposition')) ?? 'download.csv'
  return { blob, filename }
}

function parseContentDisposition(header: string | null): string | null {
  if (!header) return null
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf8Match) return decodeURIComponent(utf8Match[1])
  const plainMatch = /filename="?([^";]+)"?/i.exec(header)
  if (plainMatch) return plainMatch[1]
  return null
}
