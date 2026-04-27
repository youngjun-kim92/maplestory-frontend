import { useState, useEffect, useCallback } from 'react'
import { ledgerApi } from '../api/ledger'
import { charactersApi } from '../api/characters'
import type { EntryCategory, EntryType, LedgerEntry, MapleCharacter, WeeklyLedger } from '../types'
import { formatMeso, formatDate, formatWeekRange, CATEGORY_LABELS, toDateString } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'

const TYPE_OPTIONS = [
  { value: 'INCOME', label: '수입' },
  { value: 'EXPENSE', label: '지출' },
]

const INCOME_CATEGORIES = [
  { value: 'BOSS', label: '보스' },
  { value: 'HUNTING', label: '사냥' },
  { value: 'TRADE', label: '거래' },
  { value: 'OTHER_INCOME', label: '기타 수입' },
]

const EXPENSE_CATEGORIES = [
  { value: 'CUBE', label: '큐브' },
  { value: 'STARFORCE', label: '스타포스' },
  { value: 'OTHER_EXPENSE', label: '기타 지출' },
]

export default function LedgerPage() {
  const [ledger, setLedger] = useState<WeeklyLedger | null>(null)
  const [characters, setCharacters] = useState<MapleCharacter[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    type: 'INCOME' as EntryType,
    category: 'BOSS' as EntryCategory,
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

  const categoryOptions = form.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleTypeChange = (type: EntryType) => {
    const defaultCat = type === 'INCOME' ? 'BOSS' : 'CUBE'
    setForm((p) => ({ ...p, type, category: defaultCat as EntryCategory }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
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
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return
    await ledgerApi.deleteEntry(id)
    await fetchLedger()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-orange-400 animate-pulse">불러오는 중...</div>
      </div>
    )
  }

  const warning = ledger?.overspendingWarning

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">주간 가계부</h1>
          {ledger && (
            <p className="text-slate-400 text-sm mt-0.5">
              📅 {formatWeekRange(ledger.weekStart, ledger.weekEnd)} (목요일 기준)
            </p>
          )}
        </div>
        <Button onClick={() => setShowForm((v) => !v)} size="sm">
          {showForm ? '취소' : '+ 기록 추가'}
        </Button>
      </div>

      {/* 과소비 경고 (기능 #10) */}
      {warning?.triggered && (
        <div
          className="rounded-xl p-4 border"
          style={{ backgroundColor: '#2d1212', borderColor: '#e94560' }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-red-300 font-semibold text-sm">과소비 경고!</p>
              <p className="text-red-400 text-sm mt-0.5">{warning.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* 주간 요약 카드 */}
      {ledger && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <p className="text-slate-400 text-xs mb-1">총 수입</p>
            <p className="text-green-400 font-bold text-base">{formatMeso(ledger.totalIncome)}</p>
          </Card>
          <Card className="text-center">
            <p className="text-slate-400 text-xs mb-1">총 지출</p>
            <p className="text-red-400 font-bold text-base">{formatMeso(ledger.totalExpense)}</p>
          </Card>
          <Card className="text-center">
            <p className="text-slate-400 text-xs mb-1">순수익</p>
            <p className={`font-bold text-base ${ledger.netAmount >= 0 ? 'text-orange-400' : 'text-red-400'}`}>
              {ledger.netAmount >= 0 ? '+' : ''}{formatMeso(ledger.netAmount)}
            </p>
          </Card>
        </div>
      )}

      {/* 항목 추가 폼 */}
      {showForm && (
        <Card title="새 항목 추가" icon="✏️">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-slate-300 text-sm font-medium mb-1">타입</p>
                <div className="flex gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleTypeChange(opt.value as EntryType)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        form.type === opt.value
                          ? opt.value === 'INCOME'
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
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
          <p className="text-slate-500 text-sm text-center py-6">
            이번 주 기록이 없습니다. 첫 항목을 추가해보세요!
          </p>
        ) : (
          <div className="space-y-2">
            {ledger.entries.map((entry: LedgerEntry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between py-3 px-3 rounded-lg transition-colors"
                style={{ backgroundColor: '#0f1729' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    entry.type === 'INCOME' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                  }`}>
                    {entry.type === 'INCOME' ? '수입' : '지출'}
                  </span>
                  <span className="text-slate-300 text-xs bg-slate-700 px-2 py-0.5 rounded">
                    {CATEGORY_LABELS[entry.category]}
                  </span>
                  <div className="min-w-0">
                    <span className="text-white text-sm truncate block">
                      {entry.description || CATEGORY_LABELS[entry.category]}
                    </span>
                    {entry.characterName && (
                      <span className="text-slate-500 text-xs">{entry.characterName}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${entry.type === 'INCOME' ? 'text-green-400' : 'text-red-400'}`}>
                      {entry.type === 'INCOME' ? '+' : '-'}{formatMeso(entry.amount)}
                    </p>
                    <p className="text-slate-500 text-xs">{formatDate(entry.entryDate)}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors text-sm"
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
