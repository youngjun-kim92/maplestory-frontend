import { useState, useRef, useEffect, useCallback } from 'react'
import type { InputHTMLAttributes } from 'react'
import { getHistory, removeFromHistory } from '../../utils/autocomplete'

interface AutocompleteInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  historyKey: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function AutocompleteInput({
  label,
  historyKey,
  value,
  onChange,
  className = '',
  ...props
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)

  const computeSuggestions = useCallback(() => {
    const hist = getHistory(historyKey)
    return value.trim()
      ? hist.filter((h) => h.toLowerCase().includes(value.toLowerCase()) && h !== value)
      : hist
  }, [historyKey, value])

  useEffect(() => {
    setSuggestions(computeSuggestions())
  }, [computeSuggestions])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pick = (s: string) => {
    onChange({ target: { value: s } } as React.ChangeEvent<HTMLInputElement>)
    setOpen(false)
    setActiveIndex(-1)
  }

  const handleRemove = (s: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    removeFromHistory(historyKey, s)
    setSuggestions((prev) => prev.filter((item) => item !== s))
    setActiveIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      pick(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className="flex flex-col gap-1.5" ref={wrapRef} style={{ position: 'relative' }}>
      {label && (
        <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--text-2)' }}>
          {label}
        </label>
      )}
      <input
        className={`form-field ${className}`}
        value={value}
        onChange={onChange}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        {...props}
      />
      {open && suggestions.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border-2)',
            borderRadius: '8px',
            marginTop: '2px',
            maxHeight: '180px',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-md)',
            listStyle: 'none',
            padding: '4px 0',
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={s}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 4px 0 12px',
                backgroundColor: i === activeIndex ? 'var(--primary-dim)' : 'transparent',
              }}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(-1)}
            >
              <span
                onMouseDown={() => pick(s)}
                style={{
                  flex: 1,
                  padding: '6px 4px 6px 0',
                  fontSize: '13px',
                  cursor: 'pointer',
                  color: i === activeIndex ? 'var(--primary)' : 'var(--text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {s}
              </span>
              <button
                type="button"
                onMouseDown={(e) => handleRemove(s, e)}
                style={{
                  flexShrink: 0,
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  color: 'var(--text-3)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  marginLeft: '2px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
                title="삭제"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
