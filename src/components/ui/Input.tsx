import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--text-2)' }}>
          {label}
        </label>
      )}
      <input
        className={`form-field ${error ? 'form-field-error' : ''} ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs font-medium" style={{ color: 'var(--red)' }}>{error}</span>
      )}
    </div>
  )
}
