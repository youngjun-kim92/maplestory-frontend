import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  icon?: string
}

export default function Card({ children, className = '', title, icon }: CardProps) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        backgroundColor: 'var(--surface)',
        border: '1.5px solid var(--border)',
        boxShadow: 'var(--shadow)',
        padding: '0.5rem 0.75rem',
      }}
    >
      {(title || icon) && (
        <div
          className="flex items-center gap-2 mb-3 pb-2"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {icon && <span className="text-lg">{icon}</span>}
          {title && (
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
              {title}
            </h2>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
