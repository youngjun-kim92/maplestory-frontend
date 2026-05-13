import { useState, useEffect, useCallback } from 'react'
import { ledgerApi } from '../api/ledger'
import { charactersApi } from '../api/characters'
import { useAuth } from '../contexts/AuthContext'
import type { EntryCategory, LedgerEntry, MapleCharacter, WeeklyLedger } from '../types'
import { formatMeso, formatDateTime, CATEGORY_LABELS, toDateString, withCurrentTime, toKoreanAmount } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import AutocompleteInput from '../components/ui/AutocompleteInput'
import QuickAmountButtons from '../components/ui/QuickAmountButtons'
import { saveToHistory } from '../utils/autocomplete'

const ENHANCE_CATEGORIES: { value: EntryCategory; label: string }[] = [
  { value: 'cube',              label: '큐브' },
  { value: 'starforce',         label: '스타포스' },
  { value: 'additional_option', label: '추가옵션' },
]

export default function LedgerPage() {
  const { user, refreshUser, activeServer, activeServerId } = useAuth()
  const [ledger, setLedger] = useState<WeeklyLedger | null>(null)
  const [characters, setCharacters] = useState<MapleCharacter[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedCharId, setSelectedCharId] = useState<'all' | string>('all')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ amount: '', description: '', entryDate: '' })
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [inputMode, setInputMode] = useState<'direct' | 'calc'>('direct')
  const [calcBefore, setCalcBefore] = useState({ meso: '' })
  const [calcAfter, setCalcAfter] = useState({ meso: '' })

  const [form, setForm] = useState({
    category: 'cube' as EntryCategory,
    amount: '',
    description: '',
    entryDate: toDateString(),
  })

  const fetchLedger = useCallback(async (charId: 'all' | string) => {
    setLoading(true)
    try {
      const params = charId !== 'all' ? { characterId: Number(charId) } : undefined
      const res = await ledgerApi.getWeeklyLedger(params)
      setLedger(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    setInitialized(false)
    charactersApi.getCharacters().then((r) => {
      setCharacters(r.data)
      const main = r.data.find((c) => c.isMain) ?? r.data[0]
      if (main) setSelectedCharId(String(main.id))
      else setSelectedCharId('all')
      setInitialized(true)
    })
  }, [activeServerId])

  useEffect(() => {
    if (!initialized) return
    fetchLedger(selectedCharId)
  }, [selectedCharId, fetchLedger, initialized])

  const calcAmount = Math.max(0, Number(calcBefore.meso || '0') - Number(calcAfter.meso || '0'))

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    const submitAmount = inputMode === 'calc' ? calcAmount : Number(form.amount)
    if (!submitAmount || submitAmount < 1) return
    setSubmitting(true)
    try {
      await ledgerApi.addEntry({
        type: 'expense',
        category: form.category,
        amount: submitAmount,
        description: form.description,
        entryDate: withCurrentTime(form.entryDate),
        characterId: selectedCharId !== 'all' ? Number(selectedCharId) : null,
      })
      if (form.description.trim()) saveToHistory('ledger_memo', form.description.trim())
      setForm((p) => ({ ...p, amount: '', description: '' }))
      setCalcAfter({ meso: '' })
      await fetchLedger(selectedCharId)
      await refreshUser()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return
    await ledgerApi.deleteEntry(id)
    setEditingId(null)
    await fetchLedger(selectedCharId)
    await refreshUser()
  }

  const startEdit = (entry: LedgerEntry) => {
    setEditingId(entry.id)
    setEditForm({
      amount: String(entry.amount),
      description: entry.description || '',
      entryDate: entry.entryDate.split('T')[0],
    })
  }

  const handleEditSubmit = async (entry: LedgerEntry) => {
    const amount = Number(editForm.amount)
    if (!amount || amount < 1) return
    setEditSubmitting(true)
    try {
      await ledgerApi.updateEntry(entry.id, {
        type: entry.type,
        category: entry.category,
        amount,
        description: editForm.description,
        entryDate: withCurrentTime(editForm.entryDate),
        characterId: entry.characterId,
      })
      setEditingId(null)
      await fetchLedger(selectedCharId)
      await refreshUser()
    } finally {
      setEditSubmitting(false)
    }
  }

  const EXCLUDED_CATEGORIES = new Set(['doping', 'boss', 'hunting', 'auction'])
  const expenseEntries = ledger?.entries.filter(
    (e) => e.type === 'expense' && !EXCLUDED_CATEGORIES.has(e.category)
  ) ?? []

  const effectiveAmount = inputMode === 'calc' ? calcAmount : Number(form.amount)
  const isInsufficientMeso = !!(effectiveAmount > 0 && effectiveAmount > (activeServer?.totalMeso ?? 0))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm animate-pulse" style={{ color: 'var(--orange-light)' }}>불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>🔩 메소 강화</h1>
          {ledger && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
              📅 {ledger.weekStart} 주 (목요일 기준)
            </p>
          )}
        </div>
        {characters.length > 0 && (
          <select
            className="form-field text-sm min-w-[120px] max-w-[200px] w-auto"
            value={selectedCharId}
            onChange={(e) => setSelectedCharId(e.target.value)}
          >
            {characters.map((c) => (
              <option key={c.id} value={String(c.id)} style={{ backgroundColor: 'var(--surface-2)' }}>
                {c.isMain ? `⭐ ${c.name}` : c.name}
              </option>
            ))}
          </select>
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
          <div className="flex gap-0.5 p-0.5 rounded-xl" style={{ backgroundColor: 'var(--surface-2)', width: 'fit-content' }}>
            {(['direct', 'calc'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setInputMode(mode)
                  if (mode === 'calc') {
                    setCalcBefore({ meso: String(activeServer?.inventoryMeso ?? 0) })
                    setCalcAfter({ meso: '' })
                  }
                }}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                style={inputMode === mode
                  ? { backgroundColor: 'var(--primary)', color: '#fff' }
                  : { backgroundColor: 'transparent', color: 'var(--text-3)' }}
              >{mode === 'direct' ? '직접 입력' : '인벤 계산'}</button>
            ))}
          </div>
          {inputMode === 'calc' ? (
            <div className="space-y-2">
              <div
                className="px-3 py-2 rounded-lg text-xs"
                style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}
              >
                <span style={{ color: 'var(--text-3)' }}>현재 인벤 메소: </span>
                <span className="font-semibold" style={{ color: 'var(--text-2)' }}>
                  {formatMeso(Number(calcBefore.meso || '0'))}
                </span>
              </div>
              <div>
                <Input
                  label="강화 후 남은 인벤 메소"
                  type="number"
                  placeholder="강화 후 인벤 메소 입력"
                  value={calcAfter.meso}
                  onChange={(e) => setCalcAfter({ meso: e.target.value })}
                  min={0}
                />
                {calcAfter.meso !== '' && Number(calcAfter.meso) >= 0 && (
                  <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>
                    {formatMeso(Number(calcAfter.meso))}
                  </p>
                )}
              </div>
              {calcAmount > 0 && (
                <div className="px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  💸 강화 비용: {formatMeso(calcAmount)} 메소
                </div>
              )}
              {isInsufficientMeso && (
                <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  ⚠️ 현재 보유 메소({formatMeso(activeServer?.totalMeso ?? 0)})보다 지출이 많습니다.
                </div>
              )}
            </div>
          ) : (
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
              {isInsufficientMeso && (
                <div className="text-xs px-3 py-2 rounded-lg mt-1.5" style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  ⚠️ 현재 보유 메소({formatMeso(activeServer?.totalMeso ?? 0)})보다 지출이 많습니다. 설정에서 메소 잔액을 먼저 업데이트해주세요.
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="날짜"
              type="date"
              value={form.entryDate}
              onChange={(e) => setForm((p) => ({ ...p, entryDate: e.target.value }))}
            />
            <AutocompleteInput
              label="메모 (선택)"
              placeholder="간단한 메모"
              historyKey="ledger_memo"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={submitting} disabled={isInsufficientMeso || (inputMode === 'calc' ? !calcAmount : !form.amount)}>기록하기</Button>
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
              <div key={entry.id} className="rounded-lg overflow-hidden" style={{ border: editingId === entry.id ? '1px solid var(--primary-glow)' : '1px solid transparent' }}>
                <div className="list-row">
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
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="font-semibold text-sm" style={{ color: 'var(--red)' }}>
                        -{formatMeso(entry.amount)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{formatDateTime(entry.entryDate)}</p>
                    </div>
                    <button
                      onClick={() => editingId === entry.id ? setEditingId(null) : startEdit(entry)}
                      title="수정"
                      className="text-xs px-1.5 py-0.5 rounded transition-colors"
                      style={{ color: 'var(--primary)', backgroundColor: 'var(--primary-dim)' }}
                    >✏️</button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      title="삭제"
                      className="text-xs px-1.5 py-0.5 rounded transition-colors"
                      style={{ color: 'var(--text-3)', backgroundColor: 'var(--surface-2)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
                    >🗑️</button>
                  </div>
                </div>
                {editingId === entry.id && (
                  <div className="px-3 pb-3 pt-2 space-y-2" style={{ backgroundColor: 'var(--surface-2)' }}>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>금액</p>
                        <input
                          type="number"
                          className="form-field text-sm w-full"
                          value={editForm.amount}
                          onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                          min={1}
                        />
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>날짜</p>
                        <input
                          type="date"
                          className="form-field text-sm w-full"
                          value={editForm.entryDate}
                          onChange={(e) => setEditForm((p) => ({ ...p, entryDate: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>메모</p>
                      <input
                        type="text"
                        className="form-field text-sm w-full"
                        value={editForm.description}
                        onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                      >취소</button>
                      <button
                        onClick={() => handleEditSubmit(entry)}
                        disabled={editSubmitting}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                        style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
                      >{editSubmitting ? '저장 중...' : '저장'}</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
