import { useState, useEffect } from 'react'
import { ledgerApi } from '../api/ledger'
import { charactersApi } from '../api/characters'
import { useAuth } from '../contexts/AuthContext'
import type { MapleCharacter } from '../types'
import { formatMeso, toDateString, toKoreanAmount } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import QuickAmountButtons from '../components/ui/QuickAmountButtons'

export default function AuctionPage() {
  const { user, refreshUser } = useAuth()
  const [tab, setTab] = useState<'income' | 'expense'>('income')
  const [characters, setCharacters] = useState<MapleCharacter[]>([])

  const [incomeForm, setIncomeForm] = useState({
    itemName: '', saleAmount: '', saleDate: toDateString(), characterId: '', isPcCafe: false,
  })
  const [incomeSubmitting, setIncomeSubmitting] = useState(false)

  const [expenseForm, setExpenseForm] = useState({
    itemName: '', buyAmount: '', buyDate: toDateString(), characterId: '',
  })
  const [expenseSubmitting, setExpenseSubmitting] = useState(false)

  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    charactersApi.getCharacters().then((r) => {
      const chars = r.data
      setCharacters(chars)
      const main = chars.find((c) => c.isMain) ?? chars[0]
      if (main) {
        const id = String(main.id)
        setIncomeForm((p) => ({ ...p, characterId: id }))
        setExpenseForm((p) => ({ ...p, characterId: id }))
      }
    })
  }, [])

  const saleAmt = Number(incomeForm.saleAmount) || 0
  const isSilverPlus = ['SILVER', 'GOLD', 'DIAMOND', 'RED', 'BLACK'].includes(user?.mvpGrade ?? '')
  const feeRate = incomeForm.isPcCafe ? 0.03 : (isSilverPlus ? 0.03 : 0.05)
  const net = Math.floor(saleAmt * (1 - feeRate))

  const handleIncomeSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
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
        characterId: incomeForm.characterId ? Number(incomeForm.characterId) : null,
      })
      setIncomeForm((p) => ({ ...p, itemName: '', saleAmount: '' }))
      setSuccess('수입이 기록되었습니다.')
      setTimeout(() => setSuccess(null), 2500)
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
        entryDate: expenseForm.buyDate,
        characterId: expenseForm.characterId ? Number(expenseForm.characterId) : null,
      })
      setExpenseForm((p) => ({ ...p, itemName: '', buyAmount: '' }))
      setSuccess('지출이 기록되었습니다.')
      setTimeout(() => setSuccess(null), 2500)
      await refreshUser()
    } finally {
      setExpenseSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>🏪 경매장</h1>

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
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="아이템명 (선택)"
                placeholder="예: 앱솔 숄더"
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
            {characters.length > 0 && (
              <Select
                label="캐릭터 (선택)"
                options={[
                  { value: '', label: '선택 안함' },
                  ...characters.map((c) => ({ value: String(c.id), label: c.isMain ? `⭐ ${c.name}` : c.name })),
                ]}
                value={incomeForm.characterId}
                onChange={(e) => setIncomeForm((p) => ({ ...p, characterId: e.target.value }))}
              />
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
            {saleAmt > 0 && (
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
              <Input
                label="아이템명 (선택)"
                placeholder="예: 앱솔 무기"
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
            </div>
            {characters.length > 0 && (
              <Select
                label="캐릭터 (선택)"
                options={[
                  { value: '', label: '선택 안함' },
                  ...characters.map((c) => ({ value: String(c.id), label: c.isMain ? `⭐ ${c.name}` : c.name })),
                ]}
                value={expenseForm.characterId}
                onChange={(e) => setExpenseForm((p) => ({ ...p, characterId: e.target.value }))}
              />
            )}
            <div className="flex justify-end">
              <Button type="submit" loading={expenseSubmitting}>기록하기</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
