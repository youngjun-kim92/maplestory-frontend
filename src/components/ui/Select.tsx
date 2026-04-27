import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export default function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-slate-300 text-sm font-medium">{label}</label>
      )}
      <select
        className={`
          w-full px-3 py-2 rounded-lg text-sm text-white
          border transition-colors outline-none
          ${error
            ? 'border-red-500 bg-red-900/10'
            : 'border-slate-600 bg-slate-800 focus:border-orange-400'
          }
          ${className}
        `}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ backgroundColor: '#1e293b' }}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  )
}
