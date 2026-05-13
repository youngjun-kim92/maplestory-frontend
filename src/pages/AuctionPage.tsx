import { useState, useEffect, useCallback } from 'react'
import { Coins, TrendingDown, Package } from 'lucide-react'
import { ledgerApi } from '../api/ledger'
import { authApi } from '../api/auth'
import { charactersApi } from '../api/characters'
import { auctionCache } from '../api/inputPagesCache'
import { useAuth } from '../contexts/AuthContext'
import type { LedgerEntry, MapleCharacter } from '../types'
import { formatMeso, formatDateTime, toDateString, withCurrentTime, toKoreanAmount, CATEGORY_LABELS, getWeekStart } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import AutocompleteInput from '../components/ui/AutocompleteInput'
import QuickAmountButtons from '../components/ui/QuickAmountButtons'
import { saveToHistory } from '../utils/autocomplete'

const AUCTION_CATEGORIES = new Set(['auction', 'sol_erda'])

export default function AuctionPage() {
  const { user, refreshUser, activeServer, activeServerId } = useAuth()
  const [tab, setTab] = useState<'income' | 'expense'>('income')
  const [characters, setCharacters] = useState<MapleCharacter[]>([])
  const [selectedCharId, setSelectedCharId] = useState<'all' | string>('all')
  const [incomeMode, setIncomeMode] = useState<'item' | 'sol_erda'>('item')
  const [auctionEntries, setAuctionEntries] = useState<LedgerEntry[]>([])

  const [incomeForm, setIncomeForm] = useState({
    itemName: '', saleAmount: '', saleDate: toDateString(), isPcCafe: false,
    solErdaQty: '',
  })
  const [incomeSubmitting, setIncomeSubmitting] = useState(false)
  const [incomeInputMode, setIncomeInputMode] = useState<'direct' | 'calc'>('direct')
  const [incomeCalcBefore, setIncomeCalcBefore] = useState({ meso: '' })
  const [incomeCalcAfter, setIncomeCalcAfter] = useState({ meso: '' })

  const [expenseForm, setExpenseForm] = useState({
    itemName: '', buyAmount: '', buyDate: toDateString(),
  })
  const [expenseSubmitting, setExpenseSubmitting] = useState(false)
  const [expenseInputMode, setExpenseInputMode] = useState<'direct' | 'calc'>('direct')
  const [expenseCalcBefore, setExpenseCalcBefore] = useState({ meso: '' })
  const [expenseCalcAfter, setExpenseCalcAfter] = useState({ meso: '' })

  const [success, setSuccess] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ amount: '', description: '', entryDate: '' })
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [solPriceInput, setSolPriceInput] = useState(String(activeServer?.solErdaFragmentPrice ?? 0))
  const [solPriceSubmitting, setSolPriceSubmitting] = useState(false)

  const handleSolPriceUpdate = async () => {
    const price = Number(solPriceInput)
    if (isNaN(price) || price < 0) return
    setSolPriceSubmitting(true)
    try {
      await authApi.updateSolErdaPrice(price)
      await refreshUser()
      setSuccess('솔 에르다 조각 단가가 저장되었습니다.')
      setTimeout(() => setSuccess(null), 2500)
    } finally {
      setSolPriceSubmitting(false)
    }
  }

  const [initialized, setInitialized] = useState(false)

  const fetchEntries = useCallback(async (charId: 'all' | string) => {
    const params = charId !== 'all' ? { characterId: Number(charId) } : undefined
    const res = await ledgerApi.getWeeklyLedger(params)
    setAuctionEntries(res.data.entries.filter((e) => AUCTION_CATEGORIES.has(e.category)))
  }, [])

  useEffect(() => {
    const serverId = activeServerId ?? null
    const cached = auctionCache.get(serverId)
    if (cached) {
      setCharacters(cached.characters)
      setSelectedCharId(cached.selectedCharId)
      setInitialized(true)
      charactersApi.getCharacters()
        .then((r) => {
          const chars = r.data
          const main = chars.find((c) => c.isMain) ?? chars[0]
          auctionCache.set(serverId, { characters: chars, selectedCharId: main ? String(main.id) : 'all' })
          setCharacters(chars)
        })
        .catch(() => {})
    } else {
      setInitialized(false)
      charactersApi.getCharacters()
        .then((r) => {
          const chars = r.data
          const main = chars.find((c) => c.isMain) ?? chars[0]
          const charId = main ? String(main.id) : 'all'
          auctionCache.set(serverId, { characters: chars, selectedCharId: charId })
          setCharacters(chars)
          setSelectedCharId(charId)
          setInitialized(true)
        })
        .catch(() => {})
    }
  }, [activeServerId])

  useEffect(() => {
    if (!initialized) return
    fetchEntries(selectedCharId)
  }, [selectedCharId, fetchEntries, initialized])

  useEffect(() => {
    setSolPriceInput(String(activeServer?.solErdaFragmentPrice ?? 0))
  }, [activeServer?.id])

  const incomeCalc = Math.max(0, Number(incomeCalcAfter.meso || '0') - Number(incomeCalcBefore.meso || '0'))
  const calcExpense = Math.max(0, Number(expenseCalcBefore.meso || '0') - Number(expenseCalcAfter.meso || '0'))

  const isSilverPlus = ['SILVER', 'GOLD', 'DIAMOND', 'RED', 'BLACK'].includes(user?.mvpGrade ?? '')
  const feeRate = incomeForm.isPcCafe ? 0.03 : (isSilverPlus ? 0.03 : 0.05)

  const saleAmt = Number(incomeForm.saleAmount) || 0
  const net = Math.floor(saleAmt * (1 - feeRate))

  const solErdaQty = Number(incomeForm.solErdaQty) || 0
  const solErdaUnitPrice = activeServer?.solErdaFragmentPrice ?? 0
  const solErdaNet = solErdaQty > 0 && solErdaUnitPrice > 0
    ? Math.floor(solErdaQty * solErdaUnitPrice * (1 - feeRate))
    : 0

  const charIdNum = selectedCharId !== 'all' ? Number(selectedCharId) : null

  const handleIncomeSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (incomeMode === 'sol_erda') {
      if (!solErdaQty || solErdaQty < 1 || !solErdaNet) return
      setIncomeSubmitting(true)
      try {
        const desc = `솔 에르다 조각 ${solErdaQty}개 경매장 판매 (수수료 ${(feeRate * 100).toFixed(0)}% 적용)`
        await ledgerApi.addEntry({
          type: 'income',
          category: 'sol_erda',
          amount: solErdaNet,
          description: desc,
          entryDate: withCurrentTime(incomeForm.saleDate),
          characterId: charIdNum,
          solErdaFragments: solErdaQty,
        })
        setIncomeForm((p) => ({ ...p, solErdaQty: '' }))
        setSuccess('수입이 기록되었습니다.')
        setTimeout(() => setSuccess(null), 2500)
        await fetchEntries(selectedCharId)
        await refreshUser()
      } finally {
        setIncomeSubmitting(false)
      }
      return
    }
    const submitAmt = incomeInputMode === 'calc' ? incomeCalc : net
    if (!submitAmt || submitAmt < 1) return
    setIncomeSubmitting(true)
    try {
      const desc = incomeInputMode === 'calc'
        ? (incomeForm.itemName.trim() ? `${incomeForm.itemName.trim()} 경매장 판매 (인벤 계산)` : '경매장 판매 (인벤 계산)')
        : (incomeForm.itemName.trim() ? `${incomeForm.itemName.trim()} 경매장 판매 (수수료 ${(feeRate * 100).toFixed(0)}%)` : `경매장 판매 (수수료 ${(feeRate * 100).toFixed(0)}%)`)
      await ledgerApi.addEntry({
        type: 'income',
        category: 'auction',
        amount: submitAmt,
        description: desc,
        entryDate: withCurrentTime(incomeForm.saleDate),
        characterId: charIdNum,
      })
      if (incomeForm.itemName.trim()) saveToHistory('auction_income', incomeForm.itemName.trim())
      setIncomeForm((p) => ({ ...p, itemName: '', saleAmount: '' }))
      setIncomeCalcBefore({ meso: '' })
      setIncomeCalcAfter({ meso: '' })
      setSuccess('수입이 기록되었습니다.')
      setTimeout(() => setSuccess(null), 2500)
      await fetchEntries(selectedCharId)
      await refreshUser()
    } finally {
      setIncomeSubmitting(false)
    }
  }

  const handleExpenseSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    const amt = expenseInputMode === 'calc' ? calcExpense : Number(expenseForm.buyAmount)
    if (!amt || amt < 1) return
    setExpenseSubmitting(true)
    try {
      const desc = expenseForm.itemName
        ? `${expenseForm.itemName} 경매장 구매`
        : '경매장 구매'
      await ledgerApi.addEntry({
        type: 'expense',
        category: 'auction',
        amount: amt,
        description: desc,
        entryDate: withCurrentTime(expenseForm.buyDate),
        characterId: charIdNum,
      })
      if (expenseForm.itemName.trim()) saveToHistory('auction_expense', expenseForm.itemName.trim())
      setExpenseForm((p) => ({ ...p, itemName: '', buyAmount: '' }))
      setExpenseCalcBefore({ meso: '' })
      setExpenseCalcAfter({ meso: '' })
      setSuccess('지출이 기록되었습니다.')
      setTimeout(() => setSuccess(null), 2500)
      await fetchEntries(selectedCharId)
      await refreshUser()
    } finally {
      setExpenseSubmitting(false)
    }
  }

  const handleDeleteEntry = async (id: number) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return
    await ledgerApi.deleteEntry(id)
    setEditingId(null)
    await fetchEntries(selectedCharId)
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
      await fetchEntries(selectedCharId)
      await refreshUser()
    } finally {
      setEditSubmitting(false)
    }
  }

  const incomeEntries = auctionEntries.filter((e) => e.type === 'income')
  const expenseEntries = auctionEntries.filter((e) => e.type === 'expense')

  const expenseAmt = expenseInputMode === 'calc' ? calcExpense : Number(expenseForm.buyAmount)
  const isExpenseInsufficientMeso = !!(
    expenseAmt > 0 &&
    expenseAmt > (activeServer?.totalMeso ?? 0)
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>🏪 경매장</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>📅 {toDateString(getWeekStart())} 주 (목요일 기준)</p>
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

      {success && (
        <div
          className="px-4 py-3 rounded-xl text-sm font-medium"
          style={{ backgroundColor: 'rgba(22,163,74,0.12)', color: 'var(--green)', border: '1px solid rgba(22,163,74,0.3)' }}
        >
          ✅ {success}
        </div>
      )}

      {/* 경매장 주간 수익/지출 요약 */}
      {auctionEntries.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card stat-card-income">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-2)' }}>이번 주 경매장 수입</p>
            <p className="font-bold text-lg" style={{ color: 'var(--green)' }}>
              +{formatMeso(incomeEntries.reduce((s, e) => s + e.amount, 0))}
            </p>
          </div>
          <div className="stat-card stat-card-expense">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-2)' }}>이번 주 경매장 지출</p>
            <p className="font-bold text-lg" style={{ color: 'var(--red)' }}>
              {formatMeso(expenseEntries.reduce((s, e) => s + e.amount, 0))}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 items-start">
          {/* 탭 */}
          <div className="col-start-1 row-start-1 flex gap-2">
            {([
              { key: 'income',  label: <span className="flex items-center gap-1"><Coins size={14} strokeWidth={1.75} />경매장 수입</span> },
              { key: 'expense', label: <span className="flex items-center gap-1"><TrendingDown size={14} strokeWidth={1.75} />경매장 지출</span> },
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
          <div className="col-start-1 row-start-2">
          {tab === 'income' ? (
        <Card title="경매장 판매 수입" icon={<Coins size={18} strokeWidth={1.75} />}>
          <form onSubmit={handleIncomeSubmit} className="space-y-3">
            {/* 판매 유형 탭 */}
            <div className="flex gap-2">
              {([['item', <span key="item" className="flex items-center gap-1"><Package size={13} strokeWidth={1.75} />아이템</span>], ['sol_erda', <span key="sol_erda" className="flex items-center gap-1"><img src="/maple-icons/arcane_symbol.png" alt="" width={14} height={14} style={{ imageRendering: 'pixelated' }} />솔 에르다 조각</span>]] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setIncomeMode(mode)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={
                    incomeMode === mode
                      ? { backgroundColor: 'var(--primary-dim)', color: 'var(--primary)', border: '1.5px solid var(--primary-glow)' }
                      : { backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }
                  }
                >{label}</button>
              ))}
            </div>

            {incomeMode === 'sol_erda' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      label="수량"
                      type="number"
                      placeholder="예: 100"
                      value={incomeForm.solErdaQty}
                      onChange={(e) => setIncomeForm((p) => ({ ...p, solErdaQty: e.target.value }))}
                      min={1}
                    />
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {[10, 30, 50, 100].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setIncomeForm((p) => ({ ...p, solErdaQty: String((Number(p.solErdaQty) || 0) + n) }))}
                          className="px-2 py-0.5 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}
                        >+{n}</button>
                      ))}
                    </div>
                  </div>
                  <Input
                    label="날짜"
                    type="date"
                    value={incomeForm.saleDate}
                    onChange={(e) => setIncomeForm((p) => ({ ...p, saleDate: e.target.value }))}
                  />
                </div>
                {solErdaQty > 0 && solErdaUnitPrice > 0 && (
                  <div
                    className="p-3 rounded-xl space-y-1 text-xs"
                    style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}
                  >
                    <p style={{ color: 'var(--text-3)' }}>
                      {solErdaQty}개 × {solErdaUnitPrice.toLocaleString()} = {formatMeso(solErdaQty * solErdaUnitPrice)}
                    </p>
                    <p className="font-semibold" style={{ color: '#c4b5fd' }}>
                      수수료 {(feeRate * 100).toFixed(0)}% 후 실수령: {formatMeso(solErdaNet)}
                    </p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>🔮 조각 단가 설정</p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      className="form-field text-sm flex-1"
                      placeholder="예: 1200"
                      value={solPriceInput}
                      onChange={(e) => setSolPriceInput(e.target.value)}
                      min={0}
                    />
                    <button
                      type="button"
                      onClick={handleSolPriceUpdate}
                      disabled={solPriceSubmitting}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold shrink-0"
                      style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}
                    >
                      {solPriceSubmitting ? '저장 중...' : '저장'}
                    </button>
                  </div>
                  {Number(solPriceInput) > 0 && (
                    <p className="text-xs pl-1" style={{ color: 'var(--text-3)' }}>
                      현재: {Number(solPriceInput).toLocaleString()} 메소/개
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <AutocompleteInput
                    label="아이템명 (선택)"
                    placeholder="예: 앱솔 숄더"
                    historyKey="auction_income"
                    value={incomeForm.itemName}
                    onChange={(e) => setIncomeForm((p) => ({ ...p, itemName: e.target.value }))}
                  />
                  <Input
                    label="날짜"
                    type="date"
                    value={incomeForm.saleDate}
                    onChange={(e) => setIncomeForm((p) => ({ ...p, saleDate: e.target.value }))}
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
                  <div>
                    <Input
                      label="판매 금액 (메소)"
                      type="number"
                      placeholder="예: 3500000000"
                      value={incomeForm.saleAmount}
                      onChange={(e) => setIncomeForm((p) => ({ ...p, saleAmount: e.target.value }))}
                      min={1}
                    />
                    <QuickAmountButtons onAdd={(v) => setIncomeForm((p) => ({ ...p, saleAmount: String((Number(p.saleAmount) || 0) + v) }))} />
                    {toKoreanAmount(incomeForm.saleAmount) && (
                      <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>{toKoreanAmount(incomeForm.saleAmount)}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Input
                          label="판매 전 인벤 메소"
                          type="number"
                          placeholder="0"
                          value={incomeCalcBefore.meso}
                          onChange={(e) => setIncomeCalcBefore({ meso: e.target.value })}
                          min={0}
                        />
                        {toKoreanAmount(incomeCalcBefore.meso) && (
                          <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>{toKoreanAmount(incomeCalcBefore.meso)}</p>
                        )}
                      </div>
                      <div>
                        <Input
                          label="판매 후 인벤 메소"
                          type="number"
                          placeholder="판매 후 잔액 입력"
                          value={incomeCalcAfter.meso}
                          onChange={(e) => setIncomeCalcAfter({ meso: e.target.value })}
                          min={0}
                        />
                        {toKoreanAmount(incomeCalcAfter.meso) && (
                          <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>{toKoreanAmount(incomeCalcAfter.meso)}</p>
                        )}
                      </div>
                    </div>
                    {incomeCalc > 0 && (
                      <div
                        className="px-3 py-2 rounded-xl text-xs font-semibold"
                        style={{ backgroundColor: 'rgba(22,163,74,0.08)', color: 'var(--green)', border: '1px solid rgba(22,163,74,0.2)' }}
                      >
                        💰 수입: {formatMeso(incomeCalc)}
                        {toKoreanAmount(incomeCalc) && <span className="font-normal ml-1" style={{ color: 'var(--text-3)' }}>({toKoreanAmount(incomeCalc)})</span>}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={incomeForm.isPcCafe}
                onChange={(e) => setIncomeForm((p) => ({ ...p, isPcCafe: e.target.checked }))}
                className="w-3.5 h-3.5"
                style={{ accentColor: 'var(--primary)' }}
              />
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>PC방 접속 중</span>
            </label>
            {incomeMode === 'item' && incomeInputMode === 'direct' && saleAmt > 0 && (
              <div
                className="p-3 rounded-xl space-y-1.5 text-xs"
                style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}
              >
                <p className="font-medium" style={{ color: 'var(--text-2)' }}>수수료 안내</p>
                <p style={{ color: (incomeForm.isPcCafe || isSilverPlus) ? 'var(--green)' : 'var(--text-3)' }}>
                  • PC방 또는 MVP 실버 이상 → 3%{(incomeForm.isPcCafe || isSilverPlus) ? ' ✓' : ''}
                </p>
                <p style={{ color: (!incomeForm.isPcCafe && !isSilverPlus) ? 'var(--text-2)' : 'var(--text-3)' }}>
                  • 일반 / 브론즈 → 5%{(!incomeForm.isPcCafe && !isSilverPlus) ? ' ✓' : ''}
                </p>
                <p className="font-semibold" style={{ color: 'var(--green)' }}>
                  예상 실수령: {formatMeso(net)} 메소
                  {toKoreanAmount(net) && <span style={{ color: 'var(--text-3)' }}> ({toKoreanAmount(net)})</span>}
                </p>
                {!incomeForm.isPcCafe && !isSilverPlus && (
                  <a
                    href="/settings"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium mt-0.5"
                    style={{ backgroundColor: 'var(--primary-dim)', color: 'var(--primary)', border: '1px solid var(--primary-glow)' }}
                  >
                    MVP 등급 변경하기 →
                  </a>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" loading={incomeSubmitting}>기록하기</Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card title="경매장 구매 지출" icon="💸">
          <form onSubmit={handleExpenseSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <AutocompleteInput
                label="아이템명 (선택)"
                placeholder="예: 앱솔 무기"
                historyKey="auction_expense"
                value={expenseForm.itemName}
                onChange={(e) => setExpenseForm((p) => ({ ...p, itemName: e.target.value }))}
              />
              <Input
                label="날짜"
                type="date"
                value={expenseForm.buyDate}
                onChange={(e) => setExpenseForm((p) => ({ ...p, buyDate: e.target.value }))}
              />
            </div>

            {/* 입력 모드 토글 */}
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
              <div>
                <Input
                  label="구매 금액 (메소)"
                  type="number"
                  placeholder="예: 2000000000"
                  value={expenseForm.buyAmount}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, buyAmount: e.target.value }))}
                  min={1}
                />
                <QuickAmountButtons onAdd={(v) => setExpenseForm((p) => ({ ...p, buyAmount: String((Number(p.buyAmount) || 0) + v) }))} />
                {toKoreanAmount(expenseForm.buyAmount) && (
                  <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>{toKoreanAmount(expenseForm.buyAmount)}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      label="구매 전 인벤 메소"
                      type="number"
                      placeholder="0"
                      value={expenseCalcBefore.meso}
                      onChange={(e) => setExpenseCalcBefore({ meso: e.target.value })}
                      min={0}
                    />
                    {toKoreanAmount(expenseCalcBefore.meso) && (
                      <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>{toKoreanAmount(expenseCalcBefore.meso)}</p>
                    )}
                  </div>
                  <div>
                    <Input
                      label="구매 후 인벤 메소"
                      type="number"
                      placeholder="구매 후 잔액 입력"
                      value={expenseCalcAfter.meso}
                      onChange={(e) => setExpenseCalcAfter({ meso: e.target.value })}
                      min={0}
                    />
                    {toKoreanAmount(expenseCalcAfter.meso) && (
                      <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>{toKoreanAmount(expenseCalcAfter.meso)}</p>
                    )}
                  </div>
                </div>
                {calcExpense > 0 && (
                  <div
                    className="px-3 py-2 rounded-xl text-xs font-semibold"
                    style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}
                  >
                    💸 지출: {formatMeso(calcExpense)}
                    {toKoreanAmount(calcExpense) && <span className="font-normal ml-1" style={{ color: 'var(--text-3)' }}>({toKoreanAmount(calcExpense)})</span>}
                  </div>
                )}
              </div>
            )}

            {isExpenseInsufficientMeso && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}>
                ⚠️ 현재 보유 메소({formatMeso(activeServer?.totalMeso ?? 0)})보다 지출이 많습니다. 인벤토리/창고 메소를 먼저 업데이트해주세요.
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" loading={expenseSubmitting} disabled={isExpenseInsufficientMeso}>기록하기</Button>
            </div>
          </form>
        </Card>
      )}
          </div>

        {/* 이번 주 경매장 내역 */}
        <Card className="col-start-2 row-start-2" title="이번 주 경매장 내역" icon="📋">
        {auctionEntries.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>이번 주 경매장 기록이 없습니다.</p>
        ) : (
          <div className="space-y-1.5">
            {[...auctionEntries].sort((a, b) => b.entryDate.localeCompare(a.entryDate)).map((entry: LedgerEntry) => (
              <div key={entry.id} className="rounded-lg overflow-hidden" style={{ border: editingId === entry.id ? '1px solid var(--primary-glow)' : '1px solid transparent' }}>
                <div className="list-row">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="text-xs px-2 py-0.5 rounded-lg shrink-0"
                      style={
                        entry.type === 'income'
                          ? { backgroundColor: 'rgba(22,163,74,0.12)', color: 'var(--green)', border: '1px solid rgba(22,163,74,0.2)' }
                          : { backgroundColor: 'var(--surface-2)', color: 'var(--text-2)' }
                      }
                    >
                      {CATEGORY_LABELS[entry.category] ?? entry.category}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm truncate block" style={{ color: 'var(--text)' }}>
                        {entry.description || (entry.type === 'income' ? '경매장 수입' : '경매장 구매')}
                      </span>
                      {entry.characterName && (
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{entry.characterName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="font-semibold text-sm" style={{ color: entry.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                        {entry.type === 'income' ? '+' : '-'}{formatMeso(entry.amount)}
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
                      onClick={() => handleDeleteEntry(entry.id)}
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
    </div>
  )
}
