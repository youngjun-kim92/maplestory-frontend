import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-slate-300 text-sm font-medium">{label}</label>
      )}
      <input
        className={`
          w-full px-3 py-2 rounded-lg text-sm text-white
          border transition-colors outline-none
          ${error
            ? 'border-red-500 bg-red-900/10 focus:border-red-400'
            : 'border-slate-600 bg-slate-800 focus:border-orange-400'
          }
          placeholder:text-slate-500
          ${className}
        `}
        {...props}
      />
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  )
}
