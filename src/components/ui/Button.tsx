import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants: Record<string, string> = {
  primary: '',
  secondary: '',
  danger: '',
  ghost: '',
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #f97316 0%, #ea6c0a 100%)',
    color: '#fff',
    boxShadow: '0 2px 12px rgba(249,115,22,0.35)',
  },
  secondary: {
    backgroundColor: 'var(--surface-2)',
    color: 'var(--text)',
    border: '1px solid var(--border-2)',
  },
  danger: {
    backgroundColor: 'rgba(248,113,113,0.15)',
    color: 'var(--red)',
    border: '1px solid rgba(248,113,113,0.3)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--text-2)',
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
        inline-flex items-center justify-center gap-2 rounded-xl font-medium
        transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
        hover:brightness-110 active:scale-[0.97]
        ${variants[variant]} ${sizes[size]} ${className}
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