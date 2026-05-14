import { useState, useEffect, useCallback, useMemo } from 'react'
import { ledgerApi } from '../api/ledger'
import { charactersApi } from '../api/characters'
import { bossApi } from '../api/boss'
import { shopCache } from '../api/inputPagesCache'
import type { BossKill, DopingItem, EntryCategory, LedgerEntry, MapleCharacter } from '../types'
import { formatMeso, formatDateTime, toDateString, withCurrentTime, toKoreanAmount, CATEGORY_LABELS, CATEGORY_ICONS, difficultyLabel, getWeekStart } from '../utils/format'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import AutocompleteInput from '../components/ui/AutocompleteInput'
import QuickAmountButtons from '../components/ui/QuickAmountButtons'
import Select from '../components/ui/Select'
import { saveToHistory } from '../utils/autocomplete'

const SHOP_CATEGORIES = new Set<EntryCategory>(['trade', 'doping', 'other'])

export default function ShopPage() {
  const { activeServer, refreshUser } = useAuth()
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
  const [incomeInputMode, setIncomeInputMode] = useState<'direct' | 'calc'>('direct')
  const [incomeCalcBefore, setIncomeCalcBefore] = useState({ meso: '' })
  const [incomeCalcAfter, setIncomeCalcAfter] = useState({ meso: '' })

  const [expenseForm, setExpenseForm] = useState({
    category: 'doping' as Extract<EntryCategory, 'doping' | 'other'>,
    selectedDopingId: '',
    itemName: '',
    amount: '',
    date: toDateString(),
  })
  const [expenseSubmitting, setExpenseSubmitting] = useState(false)
  const [expenseError, setExpenseError] = useState<string | null>(null)
  const [expenseInputMode, setExpenseInputMode] = useState<'direct' | 'calc'>('direct')
  const [expenseCalcBefore, setExpenseCalcBefore] = useState({ meso: '' })
  const [expenseCalcAfter, setExpenseCalcAfter] = useState({ meso: '' })

  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [success, setSuccess] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ amount: '', description: '', entryDate: '' })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [expandedDopings, setExpandedDopings] = useState<Set<string>>(new Set())
  const [weeklyKills, setWeeklyKills] = useState<BossKill[]>([])

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
    const cached = shopCache.get()
    if (cached) {
      setCharacters(cached.characters)
      setSelectedCharId(cached.selectedCharId)
      setDopingList(cached.dopingList)
      Promise.all([charactersApi.getCharacters(), bossApi.getDopingList()])
        .then(([chars, dopings]) => {
          const charList = chars.data
          const main = charList.find((c) => c.isMain) ?? charList[0]
          shopCache.set({ characters: charList, selectedCharId: main ? String(main.id) : '', dopingList: dopings.data })
          setCharacters(charList)
          setDopingList(dopings.data)
        })
        .catch(() => {})
    } else {
      Promise.all([
        charactersApi.getCharacters(),
        bossApi.getDopingList(),
      ]).then(([chars, dopings]) => {
        const charList = chars.data
        setCharacters(charList)
        const mainChar = charList.find((c) => c.isMain) ?? charList[0]
        const charId = mainChar ? String(mainChar.id) : ''
        if (mainChar) setSelectedCharId(charId)
        setDopingList(dopings.data)
        shopCache.set({ characters: charList, selectedCharId: charId, dopingList: dopings.data })
      }).catch(() => {})
    }
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  useEffect(() => {
    if (!selectedCharId) return
    bossApi.getWeeklyBossKills({ characterId: Number(selectedCharId) })
      .then((r) => setWeeklyKills(r.data))
      .catch(() => setWeeklyKills([]))
  }, [selectedCharId])

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 2500)
  }

  const incomeCalc = Math.max(0, Number(incomeCalcAfter.meso || '0') - Number(incomeCalcBefore.meso || '0'))
  const expenseCalc = Math.max(0, Number(expenseCalcBefore.meso || '0') - Number(expenseCalcAfter.meso || '0'))

  const handleIncomeSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    const amount = incomeInputMode === 'calc' ? incomeCalc : Number(incomeForm.amount)
    if (!amount || amount < 1 || !incomeForm.itemName.trim()) return
    setIncomeSubmitting(true)
    setIncomeError(null)
    try {
      await ledgerApi.addEntry({
        type: 'income',
        category: 'trade',
        amount,
        description: incomeForm.itemName.trim(),
        entryDate: withCurrentTime(incomeForm.date),
        characterId: selectedCharId ? Number(selectedCharId) : null,
      })
      saveToHistory('shop_income', incomeForm.itemName.trim())
      setIncomeForm({ itemName: '', amount: '', date: toDateString() })
      setIncomeCalcBefore({ meso: '' })
      setIncomeCalcAfter({ meso: '' })
      await fetchEntries()
      await refreshUser()
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
    const amount = expenseInputMode === 'calc' ? expenseCalc : Number(expenseForm.amount)
    if (!amount || amount < 1 || !expenseForm.itemName.trim()) return
    setExpenseSubmitting(true)
    setExpenseError(null)
    try {
      await ledgerApi.addEntry({
        type: 'expense',
        category: expenseForm.category,
        amount,
        description: expenseForm.itemName.trim(),
        entryDate: withCurrentTime(expenseForm.date),
        characterId: selectedCharId ? Number(selectedCharId) : null,
      })
      saveToHistory('shop_expense', expenseForm.itemName.trim())
      setExpenseForm((p) => ({ ...p, selectedDopingId: '', itemName: '', amount: '', date: toDateString() }))
      setExpenseCalcBefore({ meso: '' })
      setExpenseCalcAfter({ meso: '' })
      await fetchEntries()
      await refreshUser()
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
    setEditingId(null)
    await fetchEntries()
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
      await fetchEntries()
      await refreshUser()
    } finally {
      setEditSubmitting(false)
    }
  }

  const toggleDopingGroup = (key: string) => {
    setExpandedDopings((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
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

  const bossKillMap = useMemo(() => new Map(weeklyKills.map((k) => [k.id, k])), [weeklyKills])

  const nonDopingEntries = useMemo(
    () => entries.filter((e) => !(e.type === 'expense' && e.category === 'doping')),
    [entries]
  )
  const dopingGroupMap = useMemo(() => {
    const map = new Map<string, { entries: LedgerEntry[]; total: number }>()
    for (const e of entries.filter((e) => e.type === 'expense' && e.category === 'doping')) {
      const key = e.description || '도핑'
      if (!map.has(key)) map.set(key, { entries: [], total: 0 })
      const g = map.get(key)!
      g.entries.push(e)
      g.total += e.amount
    }
    return map
  }, [entries])



  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>🛒 상점</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>📅 {toDateString(getWeekStart())} 주 (목요일 기준)</p>
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

      <div className="grid grid-cols-2 gap-4 items-start">
      {/* 입력 폼 */}
      <div className="rounded-xl p-4 space-y-3" style={panelStyle}>
        {tab === 'income' ? (
          <>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>💰 판매 수입 기록</h3>
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
              <div className="flex gap-0.5 p-0.5 rounded-xl" style={{ backgroundColor: 'var(--surface-2)', width: 'fit-content' }}>
                {(['direct', 'calc'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setIncomeInputMode(mode)
                      if (mode === 'calc') {
                        setIncomeCalcBefore({ meso: String(activeServer?.inventoryMeso ?? 0) })
                        setIncomeCalcAfter({ meso: '' })
                      }
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                    style={incomeInputMode === mode
                      ? { backgroundColor: 'var(--primary)', color: '#fff' }
                      : { backgroundColor: 'transparent', color: 'var(--text-3)' }}
                  >{mode === 'direct' ? '직접 입력' : '인벤 계산'}</button>
                ))}
              </div>
              {incomeInputMode === 'direct' ? (
                <>
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
                  {toKoreanAmount(incomeForm.amount) && (
                    <p className="text-xs pl-1" style={{ color: 'var(--text-2)' }}>{toKoreanAmount(incomeForm.amount)}</p>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Input label="판매 전 인벤 메소" type="number" placeholder="0"
                        value={incomeCalcBefore.meso} onChange={(e) => setIncomeCalcBefore({ meso: e.target.value })} min={0} />
                      {toKoreanAmount(incomeCalcBefore.meso) && <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>{toKoreanAmount(incomeCalcBefore.meso)}</p>}
                    </div>
                    <div>
                      <Input label="판매 후 인벤 메소" type="number" placeholder="판매 후 잔액"
                        value={incomeCalcAfter.meso} onChange={(e) => setIncomeCalcAfter({ meso: e.target.value })} min={0} />
                      {toKoreanAmount(incomeCalcAfter.meso) && <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>{toKoreanAmount(incomeCalcAfter.meso)}</p>}
                    </div>
                  </div>
                  {incomeCalc > 0 && (
                    <div className="px-3 py-2 rounded-xl text-xs font-semibold"
                      style={{ backgroundColor: 'rgba(22,163,74,0.08)', color: 'var(--green)', border: '1px solid rgba(22,163,74,0.2)' }}>
                      💰 수입: {formatMeso(incomeCalc)}
                      {toKoreanAmount(incomeCalc) && <span className="font-normal ml-1" style={{ color: 'var(--text-3)' }}>({toKoreanAmount(incomeCalc)})</span>}
                    </div>
                  )}
                </div>
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
            <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>🛍️ 아이템 구매 기록</h3>
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
              <div className="flex gap-0.5 p-0.5 rounded-xl" style={{ backgroundColor: 'var(--surface-2)', width: 'fit-content' }}>
                {(['direct', 'calc'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setExpenseInputMode(mode)
                      if (mode === 'calc') {
                        setExpenseCalcBefore({ meso: String(activeServer?.inventoryMeso ?? 0) })
                        setExpenseCalcAfter({ meso: '' })
                      }
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                    style={expenseInputMode === mode
                      ? { backgroundColor: 'var(--primary)', color: '#fff' }
                      : { backgroundColor: 'transparent', color: 'var(--text-3)' }}
                  >{mode === 'direct' ? '직접 입력' : '인벤 계산'}</button>
                ))}
              </div>
              {expenseInputMode === 'direct' ? (
                <>
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
                  {toKoreanAmount(expenseForm.amount) && (
                    <p className="text-xs pl-1" style={{ color: 'var(--text-2)' }}>{toKoreanAmount(expenseForm.amount)}</p>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Input label="구매 전 인벤 메소" type="number" placeholder="0"
                        value={expenseCalcBefore.meso} onChange={(e) => setExpenseCalcBefore({ meso: e.target.value })} min={0} />
                      {toKoreanAmount(expenseCalcBefore.meso) && <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>{toKoreanAmount(expenseCalcBefore.meso)}</p>}
                    </div>
                    <div>
                      <Input label="구매 후 인벤 메소" type="number" placeholder="구매 후 잔액"
                        value={expenseCalcAfter.meso} onChange={(e) => setExpenseCalcAfter({ meso: e.target.value })} min={0} />
                      {toKoreanAmount(expenseCalcAfter.meso) && <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>{toKoreanAmount(expenseCalcAfter.meso)}</p>}
                    </div>
                  </div>
                  {expenseCalc > 0 && (
                    <div className="px-3 py-2 rounded-xl text-xs font-semibold"
                      style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}>
                      💸 지출: {formatMeso(expenseCalc)}
                      {toKoreanAmount(expenseCalc) && <span className="font-normal ml-1" style={{ color: 'var(--text-3)' }}>({toKoreanAmount(expenseCalc)})</span>}
                    </div>
                  )}
                </div>
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
        <div className="rounded-xl overflow-hidden flex flex-col" style={{ ...panelStyle, maxHeight: 'calc(100vh - 320px)' }}>
        <div className="dark-panel-header shrink-0">
          <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>📋 이번 주 내역</h3>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>{entries.length}건</span>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0">
        {entries.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-3)' }}>이번 주 기록이 없어요</p>
        ) : (
          <div className="space-y-1.5 p-3">
            {/* 수입 + 도핑 외 지출 — 개별 표시 */}
            {nonDopingEntries.map((entry) => {
              const isIncome = entry.type === 'income'
              const label = CATEGORY_LABELS[entry.category] ?? entry.category
              return (
                <div key={entry.id} className="rounded-lg overflow-hidden"
                  style={{ border: editingId === entry.id ? '1px solid var(--primary-glow)' : '1px solid transparent' }}>
                  <div className="list-row">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs px-2 py-0.5 rounded-lg shrink-0"
                        style={isIncome
                          ? { backgroundColor: 'rgba(22,163,74,0.12)', color: 'var(--green)', border: '1px solid rgba(22,163,74,0.2)' }
                          : { backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                        {label}
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm truncate block" style={{ color: 'var(--text)' }}>{entry.description || label}</span>
                        {entry.characterName && <span className="text-xs" style={{ color: 'var(--text-3)' }}>{entry.characterName}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-semibold text-sm" style={{ color: isIncome ? 'var(--green)' : 'var(--red)' }}>
                          {isIncome ? '+' : '-'}{formatMeso(entry.amount)}
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
                    <div className="px-4 pb-3 pt-2 space-y-2" style={{ backgroundColor: 'var(--surface-2)' }}>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>금액</p>
                          <input type="number" className="form-field text-sm w-full" value={editForm.amount}
                            onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))} min={1} />
                        </div>
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>날짜</p>
                          <input type="date" className="form-field text-sm w-full" value={editForm.entryDate}
                            onChange={(e) => setEditForm((p) => ({ ...p, entryDate: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>메모</p>
                        <input type="text" className="form-field text-sm w-full" value={editForm.description}
                          onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ backgroundColor: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>취소</button>
                        <button onClick={() => handleEditSubmit(entry)} disabled={editSubmitting}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                          style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
                        >{editSubmitting ? '저장 중...' : '저장'}</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {/* 도핑 — 이름별 묶음 (클릭 시 펼치기) */}
            {Array.from(dopingGroupMap.entries()).map(([key, group]) => {
              const isExpanded = expandedDopings.has(key)
              return (
                <div key={`doping-group-${key}`} className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid transparent' }}>
                  {/* 그룹 헤더 */}
                  <div
                    className="list-row cursor-pointer select-none"
                    onClick={() => toggleDopingGroup(key)}
                    style={isExpanded ? { backgroundColor: 'var(--surface-2)' } : undefined}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs px-2 py-0.5 rounded-lg shrink-0"
                        style={{ backgroundColor: 'rgba(248,113,113,0.12)', color: 'var(--red)', border: '1px solid rgba(248,113,113,0.2)' }}>
                        도핑
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm truncate block" style={{ color: 'var(--text)' }}>
                          {key}{' '}
                          <span className="font-normal text-xs" style={{ color: 'var(--text-3)' }}>×{group.entries.length}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="font-semibold text-sm" style={{ color: 'var(--red)' }}>-{formatMeso(group.total)}</p>
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {/* 펼쳐진 개별 항목 */}
                  {isExpanded && group.entries.map((entry) => {
                    const linkedKill = entry.bossKillId ? bossKillMap.get(entry.bossKillId) : null
                    return (
                      <div key={entry.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <div className="flex items-center justify-between px-4 py-2.5 gap-3"
                          style={{ backgroundColor: 'var(--surface-2)' }}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {linkedKill ? (
                                <span
                                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                                  style={{ backgroundColor: 'rgba(249,115,22,0.1)', color: 'var(--primary)', border: '1px solid rgba(249,115,22,0.25)' }}
                                >
                                  <span className="inline-flex items-center gap-1"><img src="/maple-icons/boss.png" alt="" width={12} height={12} style={{ imageRendering: 'pixelated' }} /> {linkedKill.bossName} {difficultyLabel(linkedKill.difficulty)}</span>
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                                  style={{ backgroundColor: 'var(--surface)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
                                >
                                  🛒 직접 구매
                                </span>
                              )}
                            </div>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                              {formatDateTime(entry.entryDate)}
                              {entry.characterName && ` · ${entry.characterName}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-semibold text-sm whitespace-nowrap" style={{ color: 'var(--red)' }}>
                              -{formatMeso(entry.amount)}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); editingId === entry.id ? setEditingId(null) : startEdit(entry) }}
                              title="수정"
                              className="text-xs px-1.5 py-0.5 rounded transition-colors"
                              style={{ color: 'var(--primary)', backgroundColor: 'var(--primary-dim)' }}
                            >✏️</button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(entry.id) }}
                              title="삭제"
                              className="text-xs px-1.5 py-0.5 rounded transition-colors"
                              style={{ color: 'var(--text-3)', backgroundColor: 'var(--surface)' }}
                              onMouseEnter={(ev) => (ev.currentTarget.style.color = 'var(--red)')}
                              onMouseLeave={(ev) => (ev.currentTarget.style.color = 'var(--text-3)')}
                            >🗑️</button>
                          </div>
                        </div>
                        {editingId === entry.id && (
                          <div className="px-4 pb-3 pt-2 space-y-2" style={{ backgroundColor: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>금액</p>
                                <input type="number" className="form-field text-sm w-full" value={editForm.amount}
                                  onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))} min={1} />
                              </div>
                              <div>
                                <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>날짜</p>
                                <input type="date" className="form-field text-sm w-full" value={editForm.entryDate}
                                  onChange={(e) => setEditForm((p) => ({ ...p, entryDate: e.target.value }))} />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>메모</p>
                              <input type="text" className="form-field text-sm w-full" value={editForm.description}
                                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1.5 rounded-lg"
                                style={{ backgroundColor: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>취소</button>
                              <button onClick={() => handleEditSubmit(entry)} disabled={editSubmitting}
                                className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                                style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
                              >{editSubmitting ? '저장 중...' : '저장'}</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
        </div>
        </div>
      </div>
    </div>
  )
}
