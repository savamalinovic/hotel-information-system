import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiGet, type QueryValue } from '../api/client'
import type { Page } from '../api/types'

export function useList<T>({
  key,
  path,
  query,
  enabled = true,
}: {
  key: string
  path: string
  query: Record<string, QueryValue>
  enabled?: boolean
}) {
  return useQuery({
    queryKey: [key, query],
    queryFn: () => apiGet<Page<T>>(path, query),
    enabled,
    placeholderData: keepPreviousData,
  })
}
