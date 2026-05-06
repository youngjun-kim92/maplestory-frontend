import { useState, useEffect, useCallback } from 'react'
import { ledgerApi } from '../api/ledger'
import { authApi } from '../api/auth'
import { charactersApi } from '../api/characters'
import { useAuth } from '../contexts/AuthContext'
import type { LedgerEntry, MapleCharacter } from '../types'
import { formatMeso, formatDateTime, toDateString, withCurrentTime, toKoreanAmount, CATEGORY_LABELS } from '../utils/format'
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

  const [expenseForm, setExpenseForm] = useState({
    itemName: '', buyAmount: '', buyDate: toDateString(),
  })
  const [expenseSubmitting, setExpenseSubmitting] = useState(false)

  const [success, setSuccess] = useState<string | null>(null)

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
    fetchEntries(selectedCharId)
  }, [selectedCharId, fetchEntries, initialized])

  useEffect(() => {
    setSolPriceInput(String(activeServer?.solErdaFragmentPrice ?? 0))
  }, [activeServer?.id])

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
    if (!saleAmt || saleAmt < 1) return
    setIncomeSubmitting(true)
    try {
      const desc = incomeForm.itemName
        ? `${incomeForm.itemName} 경매장 판매 (수수료 ${(feeRate * 100).toFixed(0)}%)`
        : `경매장 판매 (수수료 ${(feeRate * 100).toFixed(0)}%)`
      await ledgerApi.addEntry({
        type: 'income',
        category: 'auction',
        amount: net,
        description: desc,
        entryDate: incomeForm.saleDate,
        characterId: charIdNum,
      })
      if (incomeForm.itemName.trim()) saveToHistory('auction_income', incomeForm.itemName.trim())
      setIncomeForm((p) => ({ ...p, itemName: '', saleAmount: '' }))
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
    const amt = Number(expenseForm.buyAmount)
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
    await fetchEntries(selectedCharId)
    await refreshUser()
  }

  const incomeEntries = auctionEntries.filter((e) => e.type === 'income')
  const expenseEntries = auctionEntries.filter((e) => e.type === 'expense')

  const isExpenseInsufficientMeso = !!(
    expenseForm.buyAmount &&
    Number(expenseForm.buyAmount) > 0 &&
    Number(expenseForm.buyAmount) > (activeServer?.totalMeso ?? 0)
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>🏪 경매장</h1>
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

      {/* 탭 */}
      <div className="flex rounded-xl p-1" style={{ backgroundColor: 'var(--surface-2)' }}>
        {(['income', 'expense'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={
              tab === t
                ? { backgroundColor: 'var(--surface)', color: 'var(--primary)', boxShadow: 'var(--shadow-sm)' }
                : { color: 'var(--text-2)' }
            }
          >
            {t === 'income' ? '💰 수입' : '💸 지출'}
          </button>
        ))}
      </div>

      {tab === 'income' ? (
        <Card title="경매장 판매 수입" icon="💰">
          <form onSubmit={handleIncomeSubmit} className="space-y-3">
            {/* 판매 유형 탭 */}
            <div className="flex gap-2">
              {([['item', '🎁 아이템'], ['sol_erda', '🔮 솔 에르다 조각']] as const).map(([mode, label]) => (
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
            {incomeMode === 'item' && saleAmt > 0 && (
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
              {isExpenseInsufficientMeso && (
                <div className="text-xs px-3 py-2 rounded-lg mt-1.5" style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  ⚠️ 현재 보유 메소({formatMeso(activeServer?.totalMeso ?? 0)})보다 지출이 많습니다. 인벤토리/창고 메소를 먼저 업데이트해주세요.
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={expenseSubmitting} disabled={isExpenseInsufficientMeso}>기록하기</Button>
            </div>
          </form>
        </Card>
      )}

      {/* 이번 주 경매장 내역 */}
      <Card title="이번 주 경매장 내역" icon="📋">
        {auctionEntries.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>이번 주 경매장 기록이 없습니다.</p>
        ) : (
          <div className="space-y-1.5">
            {[...incomeEntries, ...expenseEntries].map((entry: LedgerEntry) => (
              <div key={entry.id} className="list-row">
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
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p
                      className="font-semibold text-sm"
                      style={{ color: entry.type === 'income' ? 'var(--green)' : 'var(--red)' }}
                    >
                      {entry.type === 'income' ? '+' : '-'}{formatMeso(entry.amount)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{formatDateTime(entry.entryDate)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
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
