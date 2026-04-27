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
      className={`rounded-xl p-4 md:p-5 ${className}`}
      style={{ backgroundColor: '#1a1a2e', border: '1px solid #2d3748' }}
    >
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-4">
          {icon && <span className="text-xl">{icon}</span>}
          {title && <h2 className="text-white font-semibold text-base">{title}</h2>}
        </div>
      )}
      {children}
    </div>
  )
}
