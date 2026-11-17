import { Button } from './Button'

interface PaginationProps {
  page: number
  totalPages: number
  totalElements?: number
  labels: { previous: string; next: string; page: string; of: string }
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, totalElements, labels, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 pt-2 text-sm text-gray-600">
      <span>
        {labels.page} {page + 1} {labels.of} {totalPages}
        {totalElements !== undefined ? ` · ${totalElements}` : ''}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
          {labels.previous}
        </Button>
        <Button variant="secondary" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>
          {labels.next}
        </Button>
      </div>
    </div>
  )
}
