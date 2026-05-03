import { useState, useEffect, useCallback } from 'react'
import { ledgerApi } from '../api/ledger'
import { authApi } from '../api/auth'
import { charactersApi } from '../api/characters'
import { useAuth } from '../contexts/AuthContext'
import type { EntryCategory, LedgerEntry, MapleCharacter, WeeklyLedger } from '../types'
import { formatMeso, formatDate, CATEGORY_LABELS, toDateString, toKoreanAmount } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import QuickAmountButtons from '../components/ui/QuickAmountButtons'

const ENHANCE_CATEGORIES: { value: EntryCategory; label: string }[] = [
  { value: 'cube',              label: '큐브' },
  { value: 'starforce',         label: '스타포스' },
  { value: 'additional_option', label: '추가옵션' },
]

export default function LedgerPage() {
  const { user, refreshUser } = useAuth()
  const [ledger, setLedger] = useState<WeeklyLedger | null>(null)
  const [characters, setCharacters] = useState<MapleCharacter[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showMesoForm, setShowMesoForm] = useState(false)
  const [mesoForm, setMesoForm] = useState({ inventoryMeso: '', storageMeso: '' })
  const [mesoSubmitting, setMesoSubmitting] = useState(false)

  const [form, setForm] = useState({
    category: 'cube' as EntryCategory,
    amount: '',
    description: '',
    entryDate: toDateString(),
    characterId: '',
  })

  const fetchLedger = useCallback(async () => {
    setLoading(true)
    try {
      const res = await ledgerApi.getWeeklyLedger()
      setLedger(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLedger()
    charactersApi.getCharacters().then((r) => {
      const chars = r.data
      setCharacters(chars)
      const main = chars.find((c) => c.isMain) ?? chars[0]
      if (main) setForm((p) => ({ ...p, characterId: String(main.id) }))
    })
  }, [fetchLedger])

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) < 1) return
    setSubmitting(true)
    try {
      await ledgerApi.addEntry({
        type: 'expense',
        category: form.category,
        amount: Number(form.amount),
        description: form.description,
        entryDate: form.entryDate,
        characterId: form.characterId ? Number(form.characterId) : null,
      })
      setForm((p) => ({ ...p, amount: '', description: '' }))
      await fetchLedger()
      await refreshUser()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return
    await ledgerApi.deleteEntry(id)
    await fetchLedger()
    await refreshUser()
  }

  const handleMesoSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    const inventory = Number(mesoForm.inventoryMeso)
    const storage = Number(mesoForm.storageMeso)
    if (isNaN(inventory) || isNaN(storage) || inventory < 0 || storage < 0) return
    setMesoSubmitting(true)
    try {
      await authApi.updateMesoBalance({ inventoryMeso: inventory, storageMeso: storage })
      await refreshUser()
      setShowMesoForm(false)
      setMesoForm({ inventoryMeso: '', storageMeso: '' })
    } finally {
      setMesoSubmitting(false)
    }
  }

  const expenseEntries = ledger?.entries.filter((e) => e.type === 'expense') ?? []

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm animate-pulse" style={{ color: 'var(--orange-light)' }}>불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>🔩 메소 강화</h1>
        {ledger && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
            📅 {ledger.weekStart} 주 (목요일 기준) · 수입은 대시보드에서 확인하세요
          </p>
        )}
      </div>

      {/* 주간 요약 */}
      {ledger && (
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card stat-card-expense">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-2)' }}>이번 주 지출</p>
            <p className="font-bold text-lg" style={{ color: 'var(--red)' }}>{formatMeso(ledger.summary.totalExpense)}</p>
          </div>
          <div className={`stat-card ${ledger.summary.netProfit >= 0 ? 'stat-card-net-pos' : 'stat-card-net-neg'}`}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-2)' }}>순수익</p>
            <p className="font-bold text-lg" style={{ color: ledger.summary.netProfit >= 0 ? 'var(--orange-light)' : 'var(--red)' }}>
              {ledger.summary.netProfit >= 0 ? '+' : ''}{formatMeso(ledger.summary.netProfit)}
            </p>
          </div>
        </div>
      )}

      {/* 지갑 현황 */}
      <Card title="지갑 현황" icon="💰">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-2)' }}>인벤토리</p>
            <p className="font-bold text-base" style={{ color: 'var(--text)' }}>{formatMeso(user?.inventoryMeso ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-2)' }}>창고</p>
            <p className="font-bold text-base" style={{ color: 'var(--text)' }}>{formatMeso(user?.storageMeso ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-2)' }}>합계</p>
            <p className="font-bold text-base" style={{ color: 'var(--orange-light)' }}>{formatMeso(user?.totalMeso ?? 0)}</p>
          </div>
        </div>
        {!showMesoForm ? (
          <Button size="sm" variant="ghost" onClick={() => {
            setMesoForm({
              inventoryMeso: String(user?.inventoryMeso ?? 0),
              storageMeso: String(user?.storageMeso ?? 0),
            })
            setShowMesoForm(true)
          }}>
            메소 잔액 수정
          </Button>
        ) : (
          <form onSubmit={handleMesoSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="인벤토리 메소"
                  type="number"
                  placeholder="예: 500000000"
                  value={mesoForm.inventoryMeso}
                  onChange={(e) => setMesoForm((p) => ({ ...p, inventoryMeso: e.target.value }))}
                  min={0}
                />
                <QuickAmountButtons onAdd={(v) => setMesoForm((p) => ({ ...p, inventoryMeso: String((Number(p.inventoryMeso) || 0) + v) }))} />
              </div>
              <div>
                <Input
                  label="창고 메소"
                  type="number"
                  placeholder="예: 2000000000"
                  value={mesoForm.storageMeso}
                  onChange={(e) => setMesoForm((p) => ({ ...p, storageMeso: e.target.value }))}
                  min={0}
                />
                <QuickAmountButtons onAdd={(v) => setMesoForm((p) => ({ ...p, storageMeso: String((Number(p.storageMeso) || 0) + v) }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowMesoForm(false)}>취소</Button>
              <Button type="submit" loading={mesoSubmitting}>저장</Button>
            </div>
          </form>
        )}
      </Card>

      {/* 메소 강화 입력 폼 */}
      <Card title="메소 강화 지출" icon="🔩">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-2)' }}>카테고리</p>
            <div className="flex flex-wrap gap-2">
              {ENHANCE_CATEGORIES.map((cat) => (
                <label
                  key={cat.value}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer select-none transition-all text-sm font-medium"
                  style={
                    form.category === cat.value
                      ? { backgroundColor: 'var(--primary-dim)', color: 'var(--primary)', border: '1.5px solid var(--primary-glow)' }
                      : { backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }
                  }
                >
                  <input
                    type="radio"
                    name="enhance-category"
                    value={cat.value}
                    checked={form.category === cat.value}
                    onChange={() => setForm((p) => ({ ...p, category: cat.value }))}
                    className="sr-only"
                  />
                  {cat.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Input
              label="금액 (메소)"
              type="number"
              placeholder="예: 100000000"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              min={1}
            />
            <QuickAmountButtons onAdd={(v) => setForm((p) => ({ ...p, amount: String((Number(p.amount) || 0) + v) }))} />
            {toKoreanAmount(form.amount) && (
              <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>{toKoreanAmount(form.amount)}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="날짜"
              type="date"
              value={form.entryDate}
              onChange={(e) => setForm((p) => ({ ...p, entryDate: e.target.value }))}
            />
            <Input
              label="메모 (선택)"
              placeholder="간단한 메모"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          {characters.length > 0 && (
            <Select
              label="캐릭터 (선택)"
              options={[
                { value: '', label: '선택 안함' },
                ...characters.map((c) => ({ value: String(c.id), label: c.name })),
              ]}
              value={form.characterId}
              onChange={(e) => setForm((p) => ({ ...p, characterId: e.target.value }))}
            />
          )}
          <div className="flex justify-end">
            <Button type="submit" loading={submitting}>기록하기</Button>
          </div>
        </form>
      </Card>

      {/* 메소 강화 목록 */}
      <Card title="이번 주 메소 강화 내역" icon="📋">
        {expenseEntries.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>
            이번 주 지출 기록이 없습니다.
          </p>
        ) : (
          <div className="space-y-1.5">
            {expenseEntries.map((entry: LedgerEntry) => (
              <div key={entry.id} className="list-row">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="text-xs px-2 py-0.5 rounded-lg shrink-0"
                    style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-2)' }}
                  >
                    {CATEGORY_LABELS[entry.category] ?? entry.category}
                  </span>
                  <div className="min-w-0">
                    <span className="text-sm truncate block" style={{ color: 'var(--text)' }}>
                      {entry.description || CATEGORY_LABELS[entry.category]}
                    </span>
                    {entry.characterName && (
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{entry.characterName}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-semibold text-sm" style={{ color: 'var(--red)' }}>
                      -{formatMeso(entry.amount)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{formatDate(entry.entryDate)}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-sm transition-colors"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
