import { useState, useEffect, useCallback } from 'react'
import { ledgerApi } from '../api/ledger'
import { charactersApi } from '../api/characters'
import { bossApi } from '../api/boss'
import type { DopingItem, EntryCategory, LedgerEntry, MapleCharacter } from '../types'
import { formatMeso, formatDateKo, toDateString, CATEGORY_LABELS, CATEGORY_ICONS } from '../utils/format'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import AutocompleteInput from '../components/ui/AutocompleteInput'
import QuickAmountButtons from '../components/ui/QuickAmountButtons'
import Select from '../components/ui/Select'
import { saveToHistory } from '../utils/autocomplete'

const SHOP_CATEGORIES = new Set<EntryCategory>(['trade', 'doping', 'other'])

export default function ShopPage() {
  const [tab, setTab] = useState<'income' | 'expense'>('income')
  const [characters, setCharacters] = useState<MapleCharacter[]>([])
  const [selectedCharId, setSelectedCharId] = useState<string>('')
  const [dopingList, setDopingList] = useState<DopingItem[]>([])

  const [incomeForm, setIncomeForm] = useState({
    itemName: '',
    amount: '',
    date: toDateString(),
  })
  const [incomeSubmitting, setIncomeSubmitting] = useState(false)
  const [incomeError, setIncomeError] = useState<string | null>(null)

  const [expenseForm, setExpenseForm] = useState({
    category: 'doping' as Extract<EntryCategory, 'doping' | 'other'>,
    selectedDopingId: '',
    itemName: '',
    amount: '',
    date: toDateString(),
  })
  const [expenseSubmitting, setExpenseSubmitting] = useState(false)
  const [expenseError, setExpenseError] = useState<string | null>(null)

  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [success, setSuccess] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    if (!selectedCharId) return
    try {
      const res = await ledgerApi.getWeeklyLedger({ characterId: Number(selectedCharId) })
      setEntries(res.data.entries.filter((e) => SHOP_CATEGORIES.has(e.category)))
    } catch {
      setEntries([])
    }
  }, [selectedCharId])

  useEffect(() => {
    Promise.all([
      charactersApi.getCharacters(),
      bossApi.getDopingList(),
    ]).then(([chars, dopings]) => {
      const charList = chars.data
      setCharacters(charList)
      const mainChar = charList.find((c) => c.isMain) ?? charList[0]
      if (mainChar) setSelectedCharId(String(mainChar.id))
      setDopingList(dopings.data)
    }).catch(() => {})
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 2500)
  }

  const handleIncomeSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    const amount = Number(incomeForm.amount)
    if (!amount || amount < 1 || !incomeForm.itemName.trim()) return
    setIncomeSubmitting(true)
    setIncomeError(null)
    try {
      await ledgerApi.addEntry({
        type: 'income',
        category: 'trade',
        amount,
        description: incomeForm.itemName.trim(),
        entryDate: incomeForm.date,
        characterId: selectedCharId ? Number(selectedCharId) : null,
      })
      saveToHistory('shop_income', incomeForm.itemName.trim())
      setIncomeForm({ itemName: '', amount: '', date: toDateString() })
      await fetchEntries()
      showSuccess('판매 수입이 기록되었습니다.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setIncomeError(msg ?? '저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIncomeSubmitting(false)
    }
  }

  const handleExpenseSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    const amount = Number(expenseForm.amount)
    if (!amount || amount < 1 || !expenseForm.itemName.trim()) return
    setExpenseSubmitting(true)
    setExpenseError(null)
    try {
      await ledgerApi.addEntry({
        type: 'expense',
        category: expenseForm.category,
        amount,
        description: expenseForm.itemName.trim(),
        entryDate: expenseForm.date,
        characterId: selectedCharId ? Number(selectedCharId) : null,
      })
      saveToHistory('shop_expense', expenseForm.itemName.trim())
      setExpenseForm((p) => ({ ...p, selectedDopingId: '', itemName: '', amount: '', date: toDateString() }))
      await fetchEntries()
      showSuccess('구매 지출이 기록되었습니다.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setExpenseError(msg ?? '저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setExpenseSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return
    await ledgerApi.deleteEntry(id)
    await fetchEntries()
  }

  const handleDopingSelect = (dopingId: string) => {
    const doping = dopingList.find((d) => String(d.id) === dopingId)
    if (!doping) {
      setExpenseForm((p) => ({ ...p, selectedDopingId: '', itemName: '', amount: '' }))
      return
    }
    setExpenseForm((p) => ({
      ...p,
      selectedDopingId: dopingId,
      itemName: doping.name,
      amount: doping.price ? String(doping.price) : p.amount,
    }))
  }

  const panelStyle = {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
  }

  const incomeEntries = entries.filter((e) => e.type === 'income')
  const expenseEntries = entries.filter((e) => e.type === 'expense')
  const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0)
  const totalExpense = expenseEntries.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>🛒 상점</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
            직거래·개인 상점 수입과 아이템 구매 비용을 기록하세요
          </p>
        </div>
        {characters.length > 0 ? (
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
        ) : (
          <a href="/characters" className="text-xs underline" style={{ color: 'var(--primary)' }}>캐릭터 등록 →</a>
        )}
      </div>

      {/* 성공 토스트 */}
      {success && (
        <div
          className="px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ backgroundColor: 'rgba(74,222,128,0.12)', color: 'var(--green)', border: '1px solid rgba(74,222,128,0.3)' }}
        >
          ✅ {success}
        </div>
      )}

      {/* 주간 요약 */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl px-4 py-3"
          style={{ ...panelStyle, borderLeft: '3px solid var(--green)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>이번 주 거래 수입</p>
          <p className="font-bold mt-1.5 text-xl" style={{ color: 'var(--green)' }}>+{formatMeso(totalIncome)}</p>
        </div>
        <div
          className="rounded-xl px-4 py-3"
          style={{ ...panelStyle, borderLeft: '3px solid var(--red)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>이번 주 구매 지출</p>
          <p className="font-bold mt-1.5 text-xl" style={{ color: 'var(--red)' }}>-{formatMeso(totalExpense)}</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2">
        {([
          { key: 'income', label: '💰 판매 수입' },
          { key: 'expense', label: '🛍️ 아이템 구매' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={tab === t.key
              ? { backgroundColor: 'var(--primary-dim)', color: 'var(--primary)', border: '1.5px solid var(--primary-glow)' }
              : { backgroundColor: 'var(--surface)', color: 'var(--text-3)', border: '1.5px solid var(--border)' }}
          >{t.label}</button>
        ))}
      </div>

      {/* 입력 폼 */}
      <div className="rounded-xl p-4 space-y-3" style={panelStyle}>
        {tab === 'income' ? (
          <>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>💰 판매 수입 기록</h3>
            <form onSubmit={handleIncomeSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <AutocompleteInput
                  label="아이템명 / 거래 내용"
                  placeholder="예: 아케인셰이드 단검"
                  historyKey="shop_income"
                  value={incomeForm.itemName}
                  onChange={(e) => setIncomeForm((p) => ({ ...p, itemName: e.target.value }))}
                />
                <Input
                  label="판매 날짜"
                  type="date"
                  value={incomeForm.date}
                  onChange={(e) => setIncomeForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <Input
                label="판매 금액 (메소)"
                type="number"
                placeholder="예: 3500000000"
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm((p) => ({ ...p, amount: e.target.value }))}
                min={1}
              />
              <QuickAmountButtons
                onAdd={(v) => setIncomeForm((p) => ({ ...p, amount: String((Number(p.amount) || 0) + v) }))}
              />
              {incomeForm.amount && Number(incomeForm.amount) > 0 && (
                <p className="text-xs pl-1" style={{ color: 'var(--text-2)' }}>
                  = {formatMeso(Number(incomeForm.amount))} 메소
                </p>
              )}
              {incomeError && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: 'var(--red)' }}>
                  ⚠️ {incomeError}
                </p>
              )}
              <Button type="submit" loading={incomeSubmitting} className="w-full">수입 기록</Button>
            </form>
          </>
        ) : (
          <>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>🛍️ 아이템 구매 기록</h3>
            <form onSubmit={handleExpenseSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="구매 유형"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm((p) => ({
                    ...p,
                    category: e.target.value as 'doping' | 'other',
                    selectedDopingId: '',
                    itemName: '',
                  }))}
                  options={[
                    { value: 'doping', label: '💊 도핑 (소비 아이템)' },
                    { value: 'other', label: '📦 기타 구매' },
                  ]}
                />
                <Input
                  label="구매 날짜"
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>

              {/* 도핑 선택 시 도핑약 드랍박스 */}
              {expenseForm.category === 'doping' && dopingList.length > 0 && (
                <Select
                  label="도핑약 선택 (선택사항)"
                  value={expenseForm.selectedDopingId}
                  onChange={(e) => handleDopingSelect(e.target.value)}
                  options={[
                    { value: '', label: '직접 입력' },
                    ...dopingList.map((d) => ({
                      value: String(d.id),
                      label: `${d.name}${d.price ? ` — ${formatMeso(d.price)}` : ''}`,
                    })),
                  ]}
                />
              )}

              <AutocompleteInput
                label="아이템명 / 내용"
                placeholder={expenseForm.category === 'doping' ? '예: 알레리아 영약' : '예: 경험의 비약 30%'}
                historyKey="shop_expense"
                value={expenseForm.itemName}
                onChange={(e) => setExpenseForm((p) => ({ ...p, itemName: e.target.value }))}
              />
              <Input
                label="구매 금액 (메소)"
                type="number"
                placeholder="예: 50000000"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                min={1}
              />
              <QuickAmountButtons
                onAdd={(v) => setExpenseForm((p) => ({ ...p, amount: String((Number(p.amount) || 0) + v) }))}
              />
              {expenseForm.amount && Number(expenseForm.amount) > 0 && (
                <p className="text-xs pl-1" style={{ color: 'var(--text-2)' }}>
                  = {formatMeso(Number(expenseForm.amount))} 메소
                </p>
              )}
              {expenseError && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: 'var(--red)' }}>
                  ⚠️ {expenseError}
                </p>
              )}
              <Button type="submit" loading={expenseSubmitting} className="w-full">지출 기록</Button>
            </form>
          </>
        )}
      </div>

      {/* 이번 주 내역 */}
      <div className="rounded-xl overflow-hidden" style={panelStyle}>
        <div className="dark-panel-header">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>📋 이번 주 내역</h3>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>{entries.length}건</span>
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>이번 주 기록이 없어요</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {entries.map((entry) => {
              const isIncome = entry.type === 'income'
              const icon = CATEGORY_ICONS[entry.category] ?? '💫'
              const label = CATEGORY_LABELS[entry.category] ?? entry.category
              return (
                <div key={entry.id} className="list-row px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg leading-none shrink-0">{icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                        {entry.description || label}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                          {formatDateKo(entry.entryDate)}
                          {entry.characterName && ` · ${entry.characterName}`}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap"
                          style={
                            isIncome
                              ? { backgroundColor: 'rgba(74,222,128,0.12)', color: 'var(--green)' }
                              : { backgroundColor: 'rgba(248,113,113,0.12)', color: 'var(--red)' }
                          }
                        >{label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="font-bold text-sm whitespace-nowrap"
                      style={{ color: isIncome ? 'var(--green)' : 'var(--red)' }}
                    >
                      {isIncome ? '+' : '-'}{formatMeso(entry.amount)}
                    </span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      title="삭제"
                      className="w-5 h-5 flex items-center justify-center rounded text-xs"
                      style={{ color: 'var(--text-3)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
                    >✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
