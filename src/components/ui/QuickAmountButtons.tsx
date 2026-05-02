const QUICK_AMOUNTS = [
  { label: '+1천만', value: 10_000_000 },
  { label: '+5천만', value: 50_000_000 },
  { label: '+1억',   value: 100_000_000 },
  { label: '+3억',   value: 300_000_000 },
  { label: '+5억',   value: 500_000_000 },
  { label: '+10억',  value: 1_000_000_000 },
]

export default function QuickAmountButtons({ onAdd }: { onAdd: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {QUICK_AMOUNTS.map((q) => (
        <button
          key={q.value}
          type="button"
          onClick={() => onAdd(q.value)}
          className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
          style={{
            backgroundColor: 'var(--surface-2)',
            color: 'var(--primary)',
            border: '1px solid var(--primary-glow)',
          }}
        >
          {q.label}
        </button>
      ))}
    </div>
  )
}
