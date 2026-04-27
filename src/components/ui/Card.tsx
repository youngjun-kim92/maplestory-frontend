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
        border: '1px solid var(--border)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        padding: '1.25rem',
      }}
    >
      {(title || icon) && (
        <div
          className="flex items-center gap-2 mb-4 pb-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {icon && <span className="text-lg">{icon}</span>}
          {title && (
            <h2 className="font-semibold text-sm tracking-wide" style={{ color: 'var(--text)' }}>
              {title}
            </h2>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
