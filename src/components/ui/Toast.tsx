import { useEffect } from 'react'

type ToastType = 'error' | 'success' | 'warning'

const STYLES: Record<ToastType, React.CSSProperties> = {
  error:   { backgroundColor: 'rgba(220,38,38,0.14)',  color: 'var(--red)',   border: '1px solid rgba(220,38,38,0.35)' },
  success: { backgroundColor: 'rgba(22,163,74,0.14)',  color: 'var(--green)', border: '1px solid rgba(22,163,74,0.35)' },
  warning: { backgroundColor: 'rgba(251,191,36,0.14)', color: '#fbbf24',      border: '1px solid rgba(251,191,36,0.35)' },
}

export default function Toast({
  message,
  type = 'error',
  onClose,
}: {
  message: string
  type?: ToastType
  onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [message, onClose])

  return (
    <div
      className="fixed top-16 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl text-sm font-semibold"
      style={{ ...STYLES[type], boxShadow: 'var(--shadow-md)', whiteSpace: 'nowrap' }}
    >
      {message}
    </div>
  )
}
