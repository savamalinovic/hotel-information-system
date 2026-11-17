import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
      {title ? (
        <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">
          {title}
        </h2>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  )
}
