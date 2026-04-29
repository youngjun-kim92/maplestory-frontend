import { useState, useEffect, useCallback } from 'react'
import { ledgerApi } from '../api/ledger'
import { authApi } from '../api/auth'
import { charactersApi } from '../api/characters'
import { useAuth } from '../contexts/AuthContext'
import type { EntryCategory, EntryType, LedgerEntry, MapleCharacter, WeeklyLedger } from '../types'
import { formatMeso, formatDate, CATEGORY_LABELS, toDateString } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'

const TYPE_OPTIONS = [
  { value: 'income' as const, label: '수입' },
  { value: 'expense' as const, label: '지출' },
]

const INCOME_CATEGORIES = [
  { value: 'boss', label: '보스' },
  { value: 'hunting', label: '사냥' },
  { value: 'trade', label: '거래' },
  { value: 'other', label: '기타 수입' },
]

const EXPENSE_CATEGORIES = [
  { value: 'cube', label: '큐브' },
  { value: 'starforce', label: '스타포스' },
  { value: 'other', label: '기타 지출' },
]

export default function LedgerPage() {
  const { user, refreshUser } = useAuth()
  const [ledger, setLedger] = useState<WeeklyLedger | null>(null)
  const [characters, setCharacters] = useState<MapleCharacter[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showMesoForm, setShowMesoForm] = useState(false)
  const [mesoForm, setMesoForm] = useState({ inventoryMeso: '', storageMeso: '' })
  const [mesoSubmitting, setMesoSubmitting] = useState(false)

  const [form, setForm] = useState({
    type: 'income' as EntryType,
    category: 'boss' as EntryCategory,
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
    charactersApi.getCharacters().then((r) => setCharacters(r.data))
  }, [fetchLedger])

  const categoryOptions = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleTypeChange = (type: EntryType) => {
    const defaultCat = type === 'income' ? 'boss' : 'cube'
    setForm((p) => ({ ...p, type, category: defaultCat as EntryCategory }))
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) < 1) return
    setSubmitting(true)
    try {
      await ledgerApi.addEntry({
        type: form.type,
        category: form.category,
        amount: Number(form.amount),
        description: form.description,
        entryDate: form.entryDate,
        characterId: form.characterId ? Number(form.characterId) : null,
      })
      setForm((p) => ({ ...p, amount: '', description: '' }))
      setShowForm(false)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm animate-pulse" style={{ color: 'var(--orange-light)' }}>불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>주간 가계부</h1>
          {ledger && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
              📅 {ledger.weekStart} 주 (목요일 기준)
            </p>
          )}
        </div>
        <Button onClick={() => setShowForm((v) => !v)} size="sm">
          {showForm ? '취소' : '+ 기록 추가'}
        </Button>
      </div>

      {/* 주간 요약 카드 */}
      {ledger && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card stat-card-income">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-2)' }}>
              총 수입
            </p>
            <p className="font-bold text-lg" style={{ color: 'var(--green)' }}>
              {formatMeso(ledger.summary.totalIncome)}
            </p>
          </div>
          <div className="stat-card stat-card-expense">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-2)' }}>
              총 지출
            </p>
            <p className="font-bold text-lg" style={{ color: 'var(--red)' }}>
              {formatMeso(ledger.summary.totalExpense)}
            </p>
          </div>
          <div className={`stat-card ${ledger.summary.netProfit >= 0 ? 'stat-card-net-pos' : 'stat-card-net-neg'}`}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-2)' }}>
              순수익
            </p>
            <p
              className="font-bold text-lg"
              style={{ color: ledger.summary.netProfit >= 0 ? 'var(--orange-light)' : 'var(--red)' }}
            >
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
              <Input
                label="인벤토리 메소"
                type="number"
                placeholder="예: 500000000"
                value={mesoForm.inventoryMeso}
                onChange={(e) => setMesoForm((p) => ({ ...p, inventoryMeso: e.target.value }))}
                min={0}
              />
              <Input
                label="창고 메소"
                type="number"
                placeholder="예: 2000000000"
                value={mesoForm.storageMeso}
                onChange={(e) => setMesoForm((p) => ({ ...p, storageMeso: e.target.value }))}
                min={0}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowMesoForm(false)}>취소</Button>
              <Button type="submit" loading={mesoSubmitting}>저장</Button>
            </div>
          </form>
        )}
      </Card>

      {/* 항목 추가 폼 */}
      {showForm && (
        <Card title="새 항목 추가" icon="✏️">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-2)' }}>
                  타입
                </p>
                <div className="flex gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleTypeChange(opt.value as EntryType)}
                      className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                      style={
                        form.type === opt.value
                          ? opt.value === 'income'
                            ? { backgroundColor: 'rgba(52,211,153,0.15)', color: 'var(--green)', border: '1px solid rgba(52,211,153,0.3)' }
                            : { backgroundColor: 'rgba(248,113,113,0.15)', color: 'var(--red)', border: '1px solid rgba(248,113,113,0.3)' }
                          : { backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border-2)' }
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <Select
                label="카테고리"
                options={categoryOptions}
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as EntryCategory }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="금액 (메소)"
                type="number"
                placeholder="예: 100000000"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                min={1}
              />
              <Input
                label="날짜"
                type="date"
                value={form.entryDate}
                onChange={(e) => setForm((p) => ({ ...p, entryDate: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="메모 (선택)"
                placeholder="간단한 메모"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
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
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                취소
              </Button>
              <Button type="submit" loading={submitting}>
                추가하기
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 가계부 항목 목록 */}
      <Card title="이번 주 기록" icon="📋">
        {!ledger?.entries.length ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>
            이번 주 기록이 없습니다. 첫 항목을 추가해보세요!
          </p>
        ) : (
          <div className="space-y-1.5">
            {ledger.entries.map((entry: LedgerEntry) => (
              <div key={entry.id} className="list-row">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-lg shrink-0"
                    style={
                      entry.type === 'income'
                        ? { backgroundColor: 'rgba(52,211,153,0.12)', color: 'var(--green)' }
                        : { backgroundColor: 'rgba(248,113,113,0.12)', color: 'var(--red)' }
                    }
                  >
                    {entry.type === 'income' ? '수입' : '지출'}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-lg shrink-0"
                    style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-2)' }}
                  >
                    {CATEGORY_LABELS[entry.category]}
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
                    <p
                      className="font-semibold text-sm"
                      style={{ color: entry.type === 'income' ? 'var(--green)' : 'var(--red)' }}
                    >
                      {entry.type === 'income' ? '+' : '-'}{formatMeso(entry.amount)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{formatDate(entry.entryDate)}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-sm transition-colors"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
