import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
    color: '#fff',
    boxShadow: '0 2px 10px var(--primary-glow)',
  },
  secondary: {
    backgroundColor: 'var(--surface-2)',
    color: 'var(--text)',
    border: '1.5px solid var(--border-2)',
  },
  danger: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    color: 'var(--red)',
    border: '1.5px solid rgba(220, 38, 38, 0.25)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--text-2)',
    border: '1.5px solid var(--border)',
  },
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-semibold
        transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
        hover:brightness-105 active:scale-[0.97]
        ${sizes[size]} ${className}
      `}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      {loading && (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
