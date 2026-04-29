import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ledgerApi } from '../api/ledger'
import { authApi } from '../api/auth'
import { bossApi } from '../api/boss'
import { charactersApi } from '../api/characters'
import { useAuth } from '../contexts/AuthContext'
import type { BossDrop, LedgerEntry, MapleCharacter, WeeklyLedger, WeeklySummary } from '../types'
import {
  formatMeso,
  formatDateKo,
  formatWeekRange,
  getWeekStart,
  toDateString,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
} from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

// ── 달력 헬퍼 ──
function buildCalendarWeeks(allWeeks: WeeklySummary[], currentWeekStr: string) {
  // 시작점: allWeeks 중 가장 오래된 주 또는 최대 3개월 전
  let startDate: Date
  if (allWeeks.length > 0) {
    const earliest = new Date(allWeeks[0].weekStart + 'T00:00:00')
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    startDate = earliest < threeMonthsAgo ? getWeekStart(threeMonthsAgo) : earliest
  } else {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    startDate = getWeekStart(threeMonthsAgo)
  }

  const current = new Date(currentWeekStr + 'T00:00:00')
  const weekMap = new Map(allWeeks.map((w) => [w.weekStart, w]))

  // 월별 그룹 생성
  const monthGroups = new Map<string, { year: number; month: number; weeks: { weekStart: string; data: WeeklySummary | null }[] }>()

  const d = new Date(startDate)
  while (d <= current) {
    const ws = toDateString(d)
    const date = new Date(ws + 'T00:00:00')
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    if (!monthGroups.has(monthKey)) {
      monthGroups.set(monthKey, { year: date.getFullYear(), month: date.getMonth(), weeks: [] })
    }
    monthGroups.get(monthKey)!.weeks.push({ weekStart: ws, data: weekMap.get(ws) ?? null })
    d.setDate(d.getDate() + 7)
  }

  return [...monthGroups.values()].reverse()
}

const MONTH_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

export default function DashboardPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [characters, setCharacters] = useState<MapleCharacter[]>([])
  const [selectedCharId, setSelectedCharId] = useState<number | 'all'>('all')
  const [ledger, setLedger] = useState<WeeklyLedger | null>(null)
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart())
  const [loading, setLoading] = useState(true)
  const [allWeeks, setAllWeeks] = useState<WeeklySummary[]>([])
  const [allWeeksLoading, setAllWeeksLoading] = useState(true)

  const [showMesoForm, setShowMesoForm] = useState(false)
  const [mesoForm, setMesoForm] = useState({ inventoryMeso: '', storageMeso: '' })
  const [mesoSubmitting, setMesoSubmitting] = useState(false)

  const [drops, setDrops] = useState<BossDrop[]>([])
  const [dropsLoading, setDropsLoading] = useState(true)
  const [sellingId, setSellingId] = useState<number | null>(null)
  const [sellForm, setSellForm] = useState({ saleAmount: '', saleDate: toDateString() })
  const [sellSubmitting, setSellSubmitting] = useState(false)

  const [showCalendar, setShowCalendar] = useState(false)

  const weekStartStr = toDateString(weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const isThisWeek = weekStartStr === toDateString(getWeekStart())

  const fetchLedger = useCallback(async () => {
    setLoading(true)
    try {
      const currentWeekStr = toDateString(getWeekStart())
      const res = await ledgerApi.getWeeklyLedger(
        weekStartStr === currentWeekStr ? undefined : weekStartStr
      )
      setLedger(res.data)
    } finally {
      setLoading(false)
    }
  }, [weekStartStr])

  const fetchAllWeeks = useCallback(async () => {
    setAllWeeksLoading(true)
    try {
      const res = await ledgerApi.getWeeksList()
      setAllWeeks(res.data)
    } finally {
      setAllWeeksLoading(false)
    }
  }, [])

  const fetchDrops = useCallback(async () => {
    setDropsLoading(true)
    try {
      const currentWeekStr = toDateString(getWeekStart())
      const res = await bossApi.getWeeklyDrops(
        weekStartStr === currentWeekStr ? undefined : weekStartStr
      )
      setDrops(res.data)
    } catch {
      setDrops([])
    } finally {
      setDropsLoading(false)
    }
  }, [weekStartStr])

  useEffect(() => { fetchLedger() }, [fetchLedger])
  useEffect(() => { fetchAllWeeks() }, [fetchAllWeeks])
  useEffect(() => { fetchDrops() }, [fetchDrops])
  useEffect(() => {
    charactersApi.getCharacters().then((r) => setCharacters(r.data))
  }, [])

  const handleListDrop = async (dropId: number) => {
    try {
      await bossApi.listDrop(dropId)
      await fetchDrops()
    } catch { /* ignore */ }
  }

  const handleSellSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!sellingId) return
    const amount = Number(sellForm.saleAmount)
    if (!amount || amount < 1) return
    setSellSubmitting(true)
    try {
      await bossApi.sellDrop(sellingId, { saleAmount: amount, saleDate: sellForm.saleDate })
      setSellingId(null)
      setSellForm({ saleAmount: '', saleDate: toDateString() })
      await fetchDrops()
      await fetchLedger()
      await fetchAllWeeks()
    } finally {
      setSellSubmitting(false)
    }
  }

  const goWeek = (delta: number) => {
    setWeekStart((d) => {
      const next = new Date(d)
      next.setDate(next.getDate() + delta * 7)
      return next
    })
  }

  const jumpToWeek = (weekStartFromApi: string) => {
    setWeekStart(new Date(weekStartFromApi + 'T00:00:00'))
    setShowCalendar(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteEntry = async (id: number) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return
    await ledgerApi.deleteEntry(id)
    await fetchLedger()
    await fetchAllWeeks()
  }

  const openMesoForm = () => {
    setMesoForm({
      inventoryMeso: String(user?.inventoryMeso ?? 0),
      storageMeso: String(user?.storageMeso ?? 0),
    })
    setShowMesoForm(true)
  }

  const handleMesoSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    const inv = Number(mesoForm.inventoryMeso)
    const sto = Number(mesoForm.storageMeso)
    if (isNaN(inv) || isNaN(sto) || inv < 0 || sto < 0) return
    setMesoSubmitting(true)
    try {
      await authApi.updateMesoBalance({ inventoryMeso: inv, storageMeso: sto })
      await refreshUser()
      setShowMesoForm(false)
    } finally {
      setMesoSubmitting(false)
    }
  }

  const allEntries = ledger?.entries ?? []
  const entries =
    selectedCharId === 'all'
      ? allEntries
      : allEntries.filter((e) => e.characterId === selectedCharId)

  const cumulativeIncome = allWeeks.reduce((s, w) => s + w.totalIncome, 0)
  const cumulativeExpense = allWeeks.reduce((s, w) => s + w.totalExpense, 0)
  const cumulativeNet = cumulativeIncome - cumulativeExpense

  const chartData = [...allWeeks].slice(-8).map((w) => ({
    week: w.weekStart.slice(5).replace('-', '/'),
    수입: w.totalIncome,
    지출: w.totalExpense,
  }))

  const calendarMonths = buildCalendarWeeks(allWeeks, weekStartStr)
  const currentRealWeek = toDateString(getWeekStart())

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-heading" style={{ color: 'var(--text)' }}>
            📊 대시보드
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
            {formatWeekRange(weekStartStr, toDateString(weekEnd))}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* 달력 버튼 */}
          <button
            className="week-nav-btn text-base"
            onClick={() => setShowCalendar((v) => !v)}
            title="달력으로 보기"
            style={showCalendar ? { backgroundColor: 'var(--primary-dim)', color: 'var(--primary)', border: '1px solid var(--primary-glow)' } : {}}
          >
            📅
          </button>
          <button className="week-nav-btn" onClick={() => goWeek(-1)}>◀</button>
          {!isThisWeek && (
            <button className="week-nav-btn text-xs" onClick={() => { setWeekStart(getWeekStart()); setShowCalendar(false) }}>
              이번 주
            </button>
          )}
          <button
            className="week-nav-btn"
            onClick={() => goWeek(1)}
            disabled={isThisWeek}
            style={isThisWeek ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
          >
            ▶
          </button>
        </div>
      </div>

      {/* 달력 패널 */}
      {showCalendar && (
        <div
          className="rounded-2xl p-4 space-y-4"
          style={{ backgroundColor: 'var(--surface)', border: '1.5px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>📅 주간 달력</p>
            <button
              onClick={() => setShowCalendar(false)}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ color: 'var(--text-3)', backgroundColor: 'var(--surface-2)' }}
            >
              닫기
            </button>
          </div>

          {calendarMonths.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-3)' }}>기록이 없습니다</p>
          ) : (
            calendarMonths.map(({ year, month, weeks }) => (
              <div key={`${year}-${month}`}>
                <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-2)' }}>
                  {year}년 {MONTH_KO[month]}
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5">
                  {weeks.map(({ weekStart: ws, data }) => {
                    const isSelected = ws === weekStartStr
                    const isCurrentReal = ws === currentRealWeek
                    const net = data ? data.totalIncome - data.totalExpense : null
                    const hasData = data !== null
                    return (
                      <button
                        key={ws}
                        onClick={() => jumpToWeek(ws)}
                        className="rounded-xl p-2 text-center transition-all hover:scale-105 active:scale-95"
                        style={{
                          backgroundColor: isSelected
                            ? 'var(--primary-dim)'
                            : hasData
                            ? net !== null && net >= 0
                              ? 'rgba(22,163,74,0.08)'
                              : 'rgba(220,38,38,0.08)'
                            : 'var(--surface-2)',
                          border: isSelected
                            ? '2px solid var(--primary)'
                            : isCurrentReal
                            ? '2px dashed var(--primary-glow)'
                            : '1px solid var(--border)',
                        }}
                      >
                        <p
                          className="text-xs font-bold leading-tight"
                          style={{ color: isSelected ? 'var(--primary)' : 'var(--text)' }}
                        >
                          {ws.slice(5).replace('-', '/')}
                        </p>
                        {net !== null && (
                          <p
                            className="leading-tight mt-0.5"
                            style={{
                              fontSize: '9px',
                              color: net >= 0 ? 'var(--green)' : 'var(--red)',
                            }}
                          >
                            {net >= 0 ? '+' : ''}{formatMeso(net)}
                          </p>
                        )}
                        {!hasData && (
                          <p className="leading-tight mt-0.5" style={{ fontSize: '9px', color: 'var(--text-3)' }}>
                            기록없음
                          </p>
                        )}
                        {isCurrentReal && !isSelected && (
                          <p className="leading-tight mt-0.5" style={{ fontSize: '9px', color: 'var(--primary)' }}>
                            이번주
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 이번 주 요약 (3칸) */}
      {ledger && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card stat-card-income">
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>수입</p>
            <p className="font-bold text-base leading-tight" style={{ color: 'var(--green)' }}>
              {formatMeso(ledger.summary.totalIncome)}
            </p>
          </div>
          <div className="stat-card stat-card-expense">
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>지출</p>
            <p className="font-bold text-base leading-tight" style={{ color: 'var(--red)' }}>
              {formatMeso(ledger.summary.totalExpense)}
            </p>
          </div>
          <div className={`stat-card ${ledger.summary.netProfit >= 0 ? 'stat-card-net-pos' : 'stat-card-net-neg'}`}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>순수익</p>
            <p
              className="font-bold text-base leading-tight"
              style={{ color: ledger.summary.netProfit >= 0 ? 'var(--primary)' : 'var(--red)' }}
            >
              {ledger.summary.netProfit >= 0 ? '+' : ''}{formatMeso(ledger.summary.netProfit)}
            </p>
          </div>
        </div>
      )}

      {/* 캐릭터 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          className={`char-tab ${selectedCharId === 'all' ? 'char-tab-active' : ''}`}
          onClick={() => setSelectedCharId('all')}
        >
          전체
        </button>
        {characters.map((c) => (
          <button
            key={c.id}
            className={`char-tab ${selectedCharId === c.id ? 'char-tab-active' : ''}`}
            onClick={() => setSelectedCharId(c.id)}
          >
            {c.isMain ? '⭐ ' : ''}{c.name}
          </button>
        ))}
        <button
          className="char-tab"
          style={{ borderStyle: 'dashed' }}
          onClick={() => navigate('/characters')}
        >
          + 추가
        </button>
      </div>


      {/* ── 2컬럼 메인 그리드 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 왼쪽: 이번 주 내역 */}
        <Card title={isThisWeek ? '이번 주 내역' : '해당 주 내역'} icon="📋">
          {loading ? (
            <p className="text-sm text-center py-8 animate-pulse" style={{ color: 'var(--text-3)' }}>
              불러오는 중...
            </p>
          ) : entries.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">📝</p>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>아직 기록이 없어요</p>
              <button
                onClick={() => navigate('/input')}
                className="mt-3 text-sm underline"
                style={{ color: 'var(--primary)' }}
              >
                첫 기록 추가하기
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {entries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} onDelete={() => handleDeleteEntry(entry.id)} />
              ))}
            </div>
          )}
        </Card>

        {/* 오른쪽: 메소 잔액 + 차트 */}
        <div className="space-y-4">
          {/* 메소 잔액 */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>💰 현재 보유 메소</h3>
              {!showMesoForm && (
                <button
                  onClick={openMesoForm}
                  className="text-xs px-2.5 py-1 rounded-lg"
                  style={{ color: 'var(--primary)', backgroundColor: 'var(--primary-dim)', border: '1px solid var(--primary-glow)' }}
                >
                  수정
                </button>
              )}
            </div>

            {!showMesoForm ? (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '인벤토리', value: user?.inventoryMeso ?? 0, highlight: false },
                  { label: '창고',     value: user?.storageMeso ?? 0,   highlight: false },
                  { label: '합계',     value: user?.totalMeso ?? 0,     highlight: true },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl p-2 text-center"
                    style={{
                      backgroundColor: item.highlight ? 'var(--primary-dim)' : 'var(--surface-2)',
                      border: `1px solid ${item.highlight ? 'var(--primary-glow)' : 'var(--border)'}`,
                    }}
                  >
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-3)' }}>{item.label}</p>
                    <p className="font-bold text-sm" style={{ color: item.highlight ? 'var(--primary)' : 'var(--text)' }}>
                      {formatMeso(item.value)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <form onSubmit={handleMesoSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="인벤토리 메소"
                    type="number"
                    value={mesoForm.inventoryMeso}
                    onChange={(e) => setMesoForm((p) => ({ ...p, inventoryMeso: e.target.value }))}
                    min={0}
                  />
                  <Input
                    label="창고 메소"
                    type="number"
                    value={mesoForm.storageMeso}
                    onChange={(e) => setMesoForm((p) => ({ ...p, storageMeso: e.target.value }))}
                    min={0}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowMesoForm(false)}>취소</Button>
                  <Button type="submit" size="sm" loading={mesoSubmitting}>저장</Button>
                </div>
              </form>
            )}
          </Card>

          {/* 수익 추이 차트 */}
          {chartData.length > 0 && (
            <Card title="주간 수익 추이" icon="📈">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v) => formatMeso(v as number)}
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: 'var(--shadow)',
                    }}
                    cursor={{ fill: 'var(--primary-dim)' }}
                  />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="수입" fill="#16A34A" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="지출" fill="#DC2626" radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      </div>

      {/* 이번 주 물욕템 드랍 */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-2)' }}>
          📦 {isThisWeek ? '이번 주' : '해당 주'} 드랍 아이템
        </p>
        <Card>
          {dropsLoading ? (
            <p className="text-sm text-center py-6 animate-pulse" style={{ color: 'var(--text-3)' }}>불러오는 중...</p>
          ) : drops.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>드랍 기록이 없어요</p>
          ) : (
            <div className="space-y-2">
              {drops.map((drop) => (
                <div key={drop.id}>
                  <div className="list-row">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{drop.itemName}</p>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={
                            drop.status === 'sold'
                              ? { backgroundColor: 'rgba(22,163,74,0.12)', color: 'var(--green)' }
                              : drop.status === 'listed'
                              ? { backgroundColor: 'rgba(234,179,8,0.12)', color: '#ca8a04' }
                              : { backgroundColor: 'var(--primary-dim)', color: 'var(--primary)' }
                          }
                        >
                          {drop.status === 'sold' ? '✅ 판매 완료' : drop.status === 'listed' ? '🏪 경매장 등록 중' : '📦 보유 중'}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                        {drop.bossName} {drop.difficulty} {drop.characterName && `• ${drop.characterName}`}
                      </p>
                      {drop.status === 'sold' && drop.saleAmount && (
                        <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--green)' }}>
                          {formatMeso(drop.saleAmount)} 판매
                        </p>
                      )}
                    </div>
                    {drop.status === 'holding' && (
                      <button
                        onClick={() => handleListDrop(drop.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg shrink-0 font-medium transition-all"
                        style={{ backgroundColor: 'rgba(234,179,8,0.1)', color: '#ca8a04', border: '1px solid rgba(234,179,8,0.3)' }}
                      >
                        경매장 등록
                      </button>
                    )}
                    {drop.status === 'listed' && (
                      <button
                        onClick={() => {
                          setSellingId(drop.id)
                          setSellForm({ saleAmount: '', saleDate: toDateString() })
                        }}
                        className="text-xs px-2.5 py-1.5 rounded-lg shrink-0 font-medium transition-all"
                        style={{ backgroundColor: 'var(--primary-dim)', color: 'var(--primary)', border: '1px solid var(--primary-glow)' }}
                      >
                        판매 처리
                      </button>
                    )}
                  </div>

                  {/* 판매 처리 인라인 폼 */}
                  {sellingId === drop.id && drop.status === 'listed' && (
                    <form
                      onSubmit={handleSellSubmit}
                      className="mt-2 p-3 rounded-xl space-y-2"
                      style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}
                    >
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>판매 처리 — {drop.itemName}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="판매 금액 (메소)"
                          type="number"
                          placeholder="예: 3500000000"
                          value={sellForm.saleAmount}
                          onChange={(e) => setSellForm((p) => ({ ...p, saleAmount: e.target.value }))}
                          min={1}
                        />
                        <Input
                          label="판매 날짜"
                          type="date"
                          value={sellForm.saleDate}
                          onChange={(e) => setSellForm((p) => ({ ...p, saleDate: e.target.value }))}
                        />
                      </div>
                      {sellForm.saleAmount && (
                        <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                          = {formatMeso(Number(sellForm.saleAmount))}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" loading={sellSubmitting} className="flex-1">
                          판매 완료 처리
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSellingId(null)}>
                          취소
                        </Button>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                        💡 판매 처리 시 경매장 수익으로 가계부에 자동 반영됩니다.
                      </p>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 전체 누적 통계 */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-2)' }}>
          📋 전체 누적
        </p>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="stat-card stat-card-income">
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>총 수입</p>
            <p className="font-bold text-base leading-tight" style={{ color: 'var(--green)' }}>
              {formatMeso(cumulativeIncome)}
            </p>
          </div>
          <div className="stat-card stat-card-expense">
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>총 지출</p>
            <p className="font-bold text-base leading-tight" style={{ color: 'var(--red)' }}>
              {formatMeso(cumulativeExpense)}
            </p>
          </div>
          <div className={`stat-card ${cumulativeNet >= 0 ? 'stat-card-net-pos' : 'stat-card-net-neg'}`}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>총 순수익</p>
            <p
              className="font-bold text-base leading-tight"
              style={{ color: cumulativeNet >= 0 ? 'var(--primary)' : 'var(--red)' }}
            >
              {cumulativeNet >= 0 ? '+' : ''}{formatMeso(cumulativeNet)}
            </p>
          </div>
        </div>

        {/* 주간별 목록 */}
        <Card>
          {allWeeksLoading ? (
            <p className="text-sm text-center py-6 animate-pulse" style={{ color: 'var(--text-3)' }}>
              불러오는 중...
            </p>
          ) : allWeeks.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>
              아직 기록이 없어요
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {[...allWeeks].reverse().map((w) => {
                const net = w.totalIncome - w.totalExpense
                const isCurrent = weekStartStr === w.weekStart
                return (
                  <div
                    key={w.weekStart}
                    className="list-row cursor-pointer"
                    style={
                      isCurrent
                        ? { backgroundColor: 'var(--primary-dim)', outline: '1.5px solid var(--primary-glow)' }
                        : {}
                    }
                    onClick={() => jumpToWeek(w.weekStart)}
                  >
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: isCurrent ? 'var(--primary)' : 'var(--text)' }}
                      >
                        {w.weekStart.slice(5).replace('-', '/')} 주
                        {isCurrent && <span className="ml-1.5 text-xs font-normal">← 현재</span>}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                        +{formatMeso(w.totalIncome)} / -{formatMeso(w.totalExpense)}
                      </p>
                    </div>
                    <p
                      className="font-bold text-sm shrink-0"
                      style={{ color: net >= 0 ? 'var(--green)' : 'var(--red)' }}
                    >
                      {net >= 0 ? '+' : ''}{formatMeso(net)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/input')}
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 w-14 h-14 rounded-full flex items-center justify-center text-2xl z-40 transition-all hover:scale-110 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
          boxShadow: '0 4px 16px var(--primary-glow)',
          color: 'white',
        }}
        aria-label="기록 추가"
      >
        ✏️
      </button>
    </div>
  )
}

function EntryRow({ entry, onDelete }: { entry: LedgerEntry; onDelete: () => void }) {
  // 백엔드에서 소문자로 오므로 소문자 키로 직접 조회
  const categoryKey = (entry.category ?? '').toLowerCase()
  const icon = CATEGORY_ICONS[categoryKey] ?? '💫'
  const label = CATEGORY_LABELS[categoryKey] ?? entry.category
  const isIncome = (entry.type ?? '').toLowerCase() === 'income'

  return (
    <div className="list-row">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
          style={{ backgroundColor: isIncome ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)' }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
            {entry.description || label}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>{formatDateKo(entry.entryDate)}</span>
            {entry.characterName && (
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>• {entry.characterName}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <p className="font-bold text-sm" style={{ color: isIncome ? 'var(--green)' : 'var(--red)' }}>
          {isIncome ? '+' : '-'}{formatMeso(entry.amount)}
        </p>
        <button
          onClick={onDelete}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-xs"
          style={{ color: 'var(--text-3)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
