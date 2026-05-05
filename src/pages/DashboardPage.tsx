import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { ledgerApi } from '../api/ledger'
import { authApi } from '../api/auth'
import { bossApi } from '../api/boss'
import { charactersApi } from '../api/characters'
import { useAuth } from '../contexts/AuthContext'
import type {
  BossDrop, BossKill, CharacterStatsResponse, EntryCategory, EntryType, LedgerEntry, LedgerStat,
  MapleCharacter, WeeklyLedger, WeeklySummary,
} from '../types'
import {
  formatMeso,
  formatDateKo,
  formatWeekRange,
  getWeekStart,
  toDateString,
  toKoreanAmount,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  difficultyLabel,
} from '../utils/format'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import QuickAmountButtons from '../components/ui/QuickAmountButtons'

const DAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토']
const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']
const ENTRY_FILTERS = [
  { key: 'all',         label: '전체' },
  { key: 'income',      label: '수입' },
  { key: 'expense',     label: '지출' },
  { key: 'boss',        label: '보스' },
  { key: 'hunting',     label: '사냥' },
  { key: 'auction',     label: '경매장' },
  { key: 'doping',      label: '도핑' },
  { key: 'enhancement', label: '강화' },
] as const
const MONTH_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  boss:        { bg: 'rgba(249,115,22,0.12)',  color: 'var(--primary)' },
  hunting:     { bg: 'rgba(63,185,80,0.12)',   color: 'var(--green)' },
  auction:     { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24' },
  sol_erda:    { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
  cube:        { bg: 'rgba(96,165,250,0.12)',  color: '#60a5fa' },
  starforce:   { bg: 'rgba(250,204,21,0.12)',  color: '#facc15' },
  spell_trace: { bg: 'rgba(52,211,153,0.12)',  color: '#34d399' },
  other:       { bg: 'rgba(139,148,158,0.12)', color: 'var(--text-2)' },
}

function buildMonthCalendar(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1)
  const lastDate = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay.getDay(); i++) cells.push(null)
  for (let d = 1; d <= lastDate; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  const rows: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

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

  const [catStats, setCatStats] = useState<LedgerStat[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  const [charStats, setCharStats] = useState<CharacterStatsResponse[]>([])
  const [charBossCounts, setCharBossCounts] = useState<Map<number, number>>(new Map())

  const [drops, setDrops] = useState<BossDrop[]>([])
  const [dropsLoading, setDropsLoading] = useState(true)
  const [weeklyBossKills, setWeeklyBossKills] = useState<BossKill[]>([])
  const [sellingId, setSellingId] = useState<number | null>(null)
  const [sellForm, setSellForm] = useState({ saleAmount: '', saleDate: toDateString(), isPcCafe: false })
  const [sellSubmitting, setSellSubmitting] = useState(false)

  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarViewDate, setCalendarViewDate] = useState<{ year: number; month: number }>(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  // ── 수정 모달 상태 ──
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null)
  const [editForm, setEditForm] = useState({
    type: 'income' as EntryType,
    category: 'boss' as EntryCategory,
    amount: '',
    description: '',
    entryDate: '',
    characterId: '',
    solErdaFragments: '',
  })
  const [editSubmitting, setEditSubmitting] = useState(false)

  // 달력 일별 데이터 (해당 월 전체 주 fetch)
  const [calendarDayMap, setCalendarDayMap] = useState<Map<string, { income: number; expense: number; erda: number }>>(new Map())

  const weekStartStr = toDateString(weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const isThisWeek = weekStartStr === toDateString(getWeekStart())

  // 항상 목요일 기준 week 파라미터 전달
  const fetchLedger = useCallback(async () => {
    setLoading(true)
    try {
      const res = await ledgerApi.getWeeklyLedger({ week: weekStartStr })
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
      const res = await bossApi.getWeeklyDrops(weekStartStr)
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
    bossApi.getWeeklyBossKills({ week: weekStartStr })
      .then(r => setWeeklyBossKills(r.data))
      .catch(() => setWeeklyBossKills([]))
  }, [weekStartStr])
  useEffect(() => {
    charactersApi.getCharacters().then((r) => setCharacters(r.data))
  }, [])

  useEffect(() => {
    charactersApi.getCharacterStats().then((r) => setCharStats(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setStatsLoading(true)
    ledgerApi.getCategoryStats(4)
      .then((res) => setCatStats(res.data))
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  useEffect(() => {
    bossApi.getWeeklyCharacterCounts(weekStartStr)
      .then(r => {
        const map = new Map<number, number>()
        r.data.forEach(d => map.set(d.characterId, d.weeklyBossCount))
        setCharBossCounts(map)
      })
      .catch(() => setCharBossCounts(new Map()))
  }, [weekStartStr])

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
      await bossApi.sellDrop(sellingId, { saleAmount: amount, saleDate: sellForm.saleDate, isPcCafe: sellForm.isPcCafe })
      setSellingId(null)
      setSellForm({ saleAmount: '', saleDate: toDateString(), isPcCafe: false })
      await fetchDrops()
      await fetchLedger()
      await fetchAllWeeks()
      await refreshUser()
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
    await Promise.all([fetchLedger(), fetchAllWeeks(), refreshUser()])
  }

  const openEditEntry = (entry: LedgerEntry) => {
    setEditingEntry(entry)
    setEditForm({
      type: entry.type,
      category: entry.category,
      amount: String(entry.amount),
      description: entry.description ?? '',
      entryDate: entry.entryDate.slice(0, 10),
      characterId: entry.characterId ? String(entry.characterId) : '',
      solErdaFragments: entry.solErdaFragments ? String(entry.solErdaFragments) : '',
    })
  }

  const handleEditSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!editingEntry) return
    const amount = Number(editForm.amount)
    if (!amount || amount < 0) return
    setEditSubmitting(true)
    try {
      await ledgerApi.updateEntry(editingEntry.id, {
        type: editForm.type,
        category: editForm.category,
        amount,
        description: editForm.description,
        entryDate: editForm.entryDate,
        characterId: editForm.characterId ? Number(editForm.characterId) : null,
        solErdaFragments: editForm.solErdaFragments ? Number(editForm.solErdaFragments) : null,
      })
      setEditingEntry(null)
      await Promise.all([fetchLedger(), fetchAllWeeks(), refreshUser()])
    } finally {
      setEditSubmitting(false)
    }
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

  const [filter, setFilter] = useState<string>('all')

  const filteredEntries = useMemo(() => {
    switch (filter) {
      case 'income':      return entries.filter(e => e.type === 'income')
      case 'expense':     return entries.filter(e => e.type === 'expense')
      case 'boss':        return entries.filter(e => e.category === 'boss')
      case 'hunting':     return entries.filter(e => e.category === 'hunting')
      case 'auction':     return entries.filter(e => e.category === 'auction')
      case 'doping':      return entries.filter(e => e.category === 'doping')
      case 'enhancement': return entries.filter(e => ['cube','starforce','spell_trace','additional_option'].includes(e.category))
      default:            return entries
    }
  }, [entries, filter])

  // bossKillId → [doping entries] from character-filtered entries
  const dopingsByKillId = useMemo(() => {
    const map = new Map<number, LedgerEntry[]>()
    for (const e of entries) {
      if (e.category === 'doping' && e.bossKillId != null) {
        const arr = map.get(e.bossKillId) ?? []
        arr.push(e)
        map.set(e.bossKillId, arr)
      }
    }
    return map
  }, [entries])

  const killMap = useMemo(
    () => new Map(weeklyBossKills.map(k => [k.id, k])),
    [weeklyBossKills]
  )

  // Remove all doping entries with bossKillId (they appear as sub-rows)
  const displayEntries = useMemo(
    () => filteredEntries.filter(e => !(e.category === 'doping' && e.bossKillId != null)),
    [filteredEntries]
  )

  // Unified display rows: boss_group, kill_group (synthetic), or regular entry
  const displayRows = useMemo(() => {
    type DisplayRow =
      | { type: 'entry'; entry: LedgerEntry }
      | { type: 'boss_group'; bossEntry: LedgerEntry; dopings: LedgerEntry[] }
      | { type: 'kill_group'; kill: BossKill; dopings: LedgerEntry[] }

    const rows: DisplayRow[] = []
    const renderedKillIds = new Set<number>()

    for (const entry of displayEntries) {
      if (entry.category === 'boss' && entry.type === 'income' && entry.bossKillId != null) {
        const dopings = dopingsByKillId.get(entry.bossKillId) ?? []
        renderedKillIds.add(entry.bossKillId)
        rows.push({ type: 'boss_group', bossEntry: entry, dopings })
      } else {
        rows.push({ type: 'entry', entry })
      }
    }

    // Synthetic rows for doping groups not linked to a boss income entry
    // Only show when filter includes expense/doping context
    const showOrphanDopings = ['all', 'expense', 'doping'].includes(filter)
    for (const [killId, dopings] of dopingsByKillId) {
      if (!renderedKillIds.has(killId) && showOrphanDopings) {
        const kill = killMap.get(killId)
        if (kill) rows.push({ type: 'kill_group', kill, dopings })
      }
    }

    return rows
  }, [displayEntries, dopingsByKillId, killMap, filter])

  const safeNum = (v: number | null | undefined) => (v == null || isNaN(v) ? 0 : v)

  const cumulativeIncome = allWeeks.reduce((s, w) => s + safeNum(w.totalIncome), 0)
  const cumulativeExpense = allWeeks.reduce((s, w) => s + safeNum(w.totalExpense), 0)
  const cumulativeNet = cumulativeIncome - cumulativeExpense

  const chartData = [...allWeeks].slice(-8).map((w) => ({
    week: w.weekStart.slice(5).replace('-', '/'),
    수입: safeNum(w.totalIncome),
    지출: safeNum(w.totalExpense),
  }))

  const currentRealWeek = toDateString(getWeekStart())
  const weekMap = useMemo(
    () => new Map(allWeeks.map((w) => [w.weekStart, w])),
    [allWeeks]
  )

  useEffect(() => {
    if (showCalendar) {
      const today = new Date()
      setCalendarViewDate({ year: today.getFullYear(), month: today.getMonth() })
    }
  }, [showCalendar])

  // 달력 열리거나 월 바뀔 때: 해당 월의 모든 주 데이터 fetch
  useEffect(() => {
    if (!showCalendar) return
    let cancelled = false
    const rows = buildMonthCalendar(calendarViewDate.year, calendarViewDate.month)
    // 행의 첫날만 보면 목요일이 행 중간에 올 때 해당 주가 누락됨 → 모든 날짜 기준으로 fetch
    const weekStarts = [...new Set(
      rows.flatMap(row =>
        row.filter((d): d is Date => d !== null).map(d => toDateString(getWeekStart(d)))
      )
    )]
    Promise.all(weekStarts.map(ws => ledgerApi.getWeeklyLedger({ week: ws })))
      .then(results => {
        if (cancelled) return
        const map = new Map<string, { income: number; expense: number; erda: number }>()
        for (const result of results) {
          for (const entry of result.data.entries) {
            const d = entry.entryDate.slice(0, 10)
            const cur = map.get(d) ?? { income: 0, expense: 0, erda: 0 }
            if ((entry.type ?? '').toLowerCase() === 'income') cur.income += entry.amount
            else cur.expense += entry.amount
            cur.erda += entry.solErdaFragments ?? 0
            map.set(d, cur)
          }
        }
        setCalendarDayMap(map)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [showCalendar, calendarViewDate.year, calendarViewDate.month])

  const weeklyErdaFragments = entries.reduce((s, e) => s + (e.solErdaFragments ?? 0), 0)

  const panelStyle = {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
  }

  const thStyle = { color: 'var(--text-3)' } as const

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>📊 대시보드</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
            {formatWeekRange(weekStartStr, toDateString(weekEnd))}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="week-nav-btn flex items-center gap-1"
            onClick={() => setShowCalendar((v) => !v)}
            title="달력으로 보기"
            style={showCalendar ? { backgroundColor: 'var(--primary-dim)', color: 'var(--primary)', border: '1px solid var(--primary-glow)' } : {}}
          >
            <span className="text-base">📅</span>
            <span className="hidden sm:inline text-xs font-normal" style={{ color: showCalendar ? 'var(--primary)' : 'var(--text-2)' }}>
              오늘 {toDateString()}
            </span>
          </button>
          <button
            className="week-nav-btn"
            onClick={() => goWeek(-1)}
            title={(() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); return `이전 주 (${d.getMonth() + 1}/${d.getDate()})` })()}
          >◀</button>
          {!isThisWeek && (
            <button className="week-nav-btn text-xs" onClick={() => { setWeekStart(getWeekStart()); setShowCalendar(false) }}>
              이번 주
            </button>
          )}
          <button
            className="week-nav-btn"
            onClick={() => goWeek(1)}
            disabled={isThisWeek}
            title={isThisWeek ? '이번 주가 최신입니다' : (() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); return `다음 주 (${d.getMonth() + 1}/${d.getDate()})` })()}
            style={isThisWeek ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
          >▶</button>
        </div>
      </div>

      {/* 달력 패널 */}
      {showCalendar && (
        <div className="rounded-xl overflow-hidden" style={{ ...panelStyle, boxShadow: 'var(--shadow-md)' }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <button
              onClick={() => setCalendarViewDate(({ year, month }) => {
                const d = new Date(year, month - 1, 1)
                return { year: d.getFullYear(), month: d.getMonth() }
              })}
              className="week-nav-btn text-xs"
            >◀</button>
            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              {calendarViewDate.year}년 {MONTH_KO[calendarViewDate.month]}
            </p>
            <button
              onClick={() => setCalendarViewDate(({ year, month }) => {
                const d = new Date(year, month + 1, 1)
                return { year: d.getFullYear(), month: d.getMonth() }
              })}
              className="week-nav-btn text-xs"
            >▶</button>
          </div>

          <div className="grid grid-cols-7 px-3 mb-0.5">
            {DAY_HEADERS.map((h, i) => (
              <div
                key={h}
                className="text-center text-xs py-1 font-medium"
                style={{ color: i === 0 ? 'var(--red)' : i === 6 ? '#93c5fd' : 'var(--text-3)' }}
              >{h}</div>
            ))}
          </div>

          <div className="px-2 pb-3 space-y-0.5">
            {buildMonthCalendar(calendarViewDate.year, calendarViewDate.month).map((row, rowIdx) => {
              const todayStr = toDateString(new Date())
              const weekEndStr = toDateString(weekEnd)

              // 이 행에 선택된 주(목~수) 셀이 있는지 → 행 테두리용
              const rowHasSelected = row.some(d => {
                if (!d) return false
                const ds = toDateString(d)
                return ds >= weekStartStr && ds <= weekEndStr
              })
              // 이 행에 현재 실제 주 셀이 있는지 → 점선 테두리용
              const rowHasCurrentWeek = row.some(
                d => d !== null && toDateString(getWeekStart(d)) === currentRealWeek
              )

              return (
                <div
                  key={rowIdx}
                  className="grid grid-cols-7 rounded-xl"
                  style={{
                    border: rowHasSelected
                      ? '1.5px solid var(--primary)'
                      : rowHasCurrentWeek
                        ? '1.5px dashed var(--primary-glow)'
                        : '1px solid transparent',
                  }}
                >
                  {row.map((day, colIdx) => {
                    const isToday = day ? toDateString(day) === todayStr : false
                    const dayStr = day ? toDateString(day) : ''
                    const dayData = dayStr ? calendarDayMap.get(dayStr) : undefined
                    const isInSelected = dayStr !== '' && dayStr >= weekStartStr && dayStr <= toDateString(weekEnd)
                    const dayWeekStart = day ? toDateString(getWeekStart(day)) : ''
                    const dayWeekData = dayWeekStart ? weekMap.get(dayWeekStart) : undefined
                    const dayNet = dayWeekData ? dayWeekData.totalIncome - dayWeekData.totalExpense : null

                    return (
                      <div
                        key={colIdx}
                        className="flex flex-col items-center py-1.5 min-h-[4.5rem] transition-colors"
                        style={{
                          backgroundColor: !day ? undefined
                            : isInSelected ? 'var(--primary-dim)'
                            : dayNet !== null
                              ? dayNet >= 0 ? 'rgba(63,185,80,0.04)' : 'rgba(248,81,73,0.04)'
                              : undefined,
                          cursor: day ? 'pointer' : 'default',
                          borderRadius: colIdx === 0 ? '0.6rem 0 0 0.6rem' : colIdx === 6 ? '0 0.6rem 0.6rem 0' : undefined,
                        }}
                        onClick={() => day && jumpToWeek(toDateString(getWeekStart(day)))}
                      >
                        {day && (
                          <>
                            <div
                              className="w-6 h-6 flex items-center justify-center rounded-full"
                              style={isToday ? { backgroundColor: 'var(--primary)' } : {}}
                            >
                              <span
                                style={{
                                  fontSize: '11px',
                                  lineHeight: 1,
                                  fontWeight: isToday ? 700 : 500,
                                  color: isToday
                                    ? '#fff'
                                    : isInSelected
                                      ? 'var(--primary)'
                                      : colIdx === 0
                                        ? 'var(--red)'
                                        : colIdx === 6
                                          ? '#93c5fd'
                                          : 'var(--text)',
                                }}
                              >{day.getDate()}</span>
                            </div>
                            {/* 일별 요약 */}
                            <div className="flex flex-col items-center mt-1 gap-0.5 w-full px-0.5">
                              {dayData && dayData.income > 0 && (
                                <span style={{ fontSize: '9px', lineHeight: 1.2, color: 'var(--green)', fontWeight: 600, textAlign: 'center' }}>
                                  +{formatMeso(dayData.income)}
                                </span>
                              )}
                              {dayData && dayData.expense > 0 && (
                                <span style={{ fontSize: '9px', lineHeight: 1.2, color: 'var(--red)', fontWeight: 600, textAlign: 'center' }}>
                                  -{formatMeso(dayData.expense)}
                                </span>
                              )}
                              {dayData && dayData.erda > 0 && (
                                <span style={{ fontSize: '8.5px', lineHeight: 1.2, color: '#c4b5fd', fontWeight: 600, textAlign: 'center' }}>
                                  🔹{dayData.erda}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3" style={{ color: 'var(--text-3)', fontSize: '10px' }}>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'rgba(74,222,128,0.2)' }} />수익
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'rgba(248,113,113,0.15)' }} />지출 초과
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ border: '1.5px dashed var(--primary-glow)' }} />이번 주
              </span>
            </div>
            <button
              onClick={() => setShowCalendar(false)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ color: 'var(--text-2)', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >닫기</button>
          </div>
        </div>
      )}

      {/* ── 섹션 1: 메소 KPI ── */}
      {ledger && (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>
              💰 메소
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: '이번 주 수입', value: `+${formatMeso(ledger.summary.totalIncome)}`, color: 'var(--green)', icon: '📥' },
                { label: '이번 주 지출', value: `-${formatMeso(ledger.summary.totalExpense)}`, color: 'var(--red)', icon: '📤' },
                {
                  label: '순수익',
                  value: `${ledger.summary.netProfit >= 0 ? '+' : ''}${formatMeso(ledger.summary.netProfit)}`,
                  color: ledger.summary.netProfit >= 0 ? 'var(--primary)' : 'var(--red)',
                  icon: ledger.summary.netProfit >= 0 ? '📈' : '📉',
                },
                {
                  label: '현재 보유 메소',
                  value: formatMeso(user?.totalMeso ?? 0),
                  color: 'var(--primary)',
                  icon: '🏦',
                  action: openMesoForm,
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="relative overflow-hidden rounded-xl"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${kpi.color}`,
                    padding: '0.9rem 1rem',
                  }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)', letterSpacing: '0.05em' }}>
                      {kpi.label}
                    </p>
                    {'action' in kpi && kpi.action && (
                      <button
                        onClick={kpi.action}
                        className="text-xs px-1.5 py-0.5 rounded shrink-0"
                        style={{ color: 'var(--primary)', backgroundColor: 'var(--primary-dim)', lineHeight: 1.4 }}
                      >수정</button>
                    )}
                  </div>
                  <p
                    className="font-bold mt-2 leading-none"
                    style={{ color: kpi.color, fontSize: 'clamp(1rem, 2.2vw, 1.35rem)' }}
                  >
                    {kpi.value}
                  </p>
                  <span
                    className="absolute bottom-2 right-2.5 select-none pointer-events-none"
                    style={{ fontSize: '1.8rem', lineHeight: 1, opacity: 0.1 }}
                  >
                    {kpi.icon}
                  </span>
                </div>
              ))}
            </div>

            {/* 메소 수정 폼 */}
            {showMesoForm && (
              <form
                onSubmit={handleMesoSubmit}
                className="mt-3 rounded-xl p-4 space-y-3"
                style={panelStyle}
              >
                <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>💰 보유 메소 업데이트</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      label="인벤토리 메소"
                      type="number"
                      value={mesoForm.inventoryMeso}
                      onChange={(e) => setMesoForm((p) => ({ ...p, inventoryMeso: e.target.value }))}
                      min={0}
                    />
                    <QuickAmountButtons onAdd={(v) => setMesoForm((p) => ({ ...p, inventoryMeso: String((Number(p.inventoryMeso) || 0) + v) }))} />
                    {toKoreanAmount(mesoForm.inventoryMeso) && (
                      <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>{toKoreanAmount(mesoForm.inventoryMeso)} 메소</p>
                    )}
                  </div>
                  <div>
                    <Input
                      label="창고 메소"
                      type="number"
                      value={mesoForm.storageMeso}
                      onChange={(e) => setMesoForm((p) => ({ ...p, storageMeso: e.target.value }))}
                      min={0}
                    />
                    <QuickAmountButtons onAdd={(v) => setMesoForm((p) => ({ ...p, storageMeso: String((Number(p.storageMeso) || 0) + v) }))} />
                    {toKoreanAmount(mesoForm.storageMeso) && (
                      <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>{toKoreanAmount(mesoForm.storageMeso)} 메소</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMesoForm((p) => ({
                      inventoryMeso: '0',
                      storageMeso: String((Number(p.storageMeso) || 0) + (Number(p.inventoryMeso) || 0)),
                    }))}
                    className="flex-1 text-xs px-2 py-1.5 rounded-lg transition-all"
                    style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                  >
                    창고로 옮기기 →
                  </button>
                  <button
                    type="button"
                    onClick={() => setMesoForm((p) => ({
                      storageMeso: '0',
                      inventoryMeso: String((Number(p.inventoryMeso) || 0) + (Number(p.storageMeso) || 0)),
                    }))}
                    className="flex-1 text-xs px-2 py-1.5 rounded-lg transition-all"
                    style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                  >
                    ← 인벤으로 옮기기
                  </button>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowMesoForm(false)}>취소</Button>
                  <Button type="submit" size="sm" loading={mesoSubmitting}>저장</Button>
                </div>
              </form>
            )}
          </div>

          {/* ── 솔 에르다 조각 (컴팩트) ── */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderLeft: '3px solid #a78bfa',
            }}
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🔮</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
              {isThisWeek ? '이번 주' : '해당 주'} 솔 에르다 조각
            </span>
            <span className="ml-auto font-bold text-xl" style={{ color: '#c4b5fd' }}>
              {weeklyErdaFragments}개
            </span>
          </div>
        </>
      )}

      {/* 캐릭터 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          className={`char-tab ${selectedCharId === 'all' ? 'char-tab-active' : ''}`}
          onClick={() => setSelectedCharId('all')}
        >전체</button>
        {characters.map((c) => (
          <button
            key={c.id}
            className={`char-tab ${selectedCharId === c.id ? 'char-tab-active' : ''}`}
            onClick={() => setSelectedCharId(c.id)}
          >{c.isMain ? '⭐ ' : ''}{c.name}</button>
        ))}
        <button
          className="char-tab"
          style={{ borderStyle: 'dashed' }}
          onClick={() => navigate('/characters')}
        >+ 추가</button>
      </div>

      {/* 메인 2컬럼 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* 왼쪽: 내역 테이블 */}
        <div className="lg:col-span-3 rounded-xl overflow-hidden" style={panelStyle}>
          <div className="dark-panel-header">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              📋 {isThisWeek ? '이번 주' : '해당 주'} 내역
            </h3>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>{filteredEntries.length}건</span>
          </div>

          {/* 필터 바 */}
          <div className="flex gap-1 px-3 py-2 overflow-x-auto scrollbar-hide" style={{ borderBottom: '1px solid var(--border)' }}>
            {ENTRY_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="text-xs px-2.5 py-1 rounded-lg shrink-0 font-medium transition-all"
                style={filter === f.key
                  ? { backgroundColor: 'var(--primary-dim)', color: 'var(--primary)', border: '1px solid var(--primary-glow)' }
                  : { backgroundColor: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid transparent' }}
              >{f.label}</button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-center py-8 animate-pulse" style={{ color: 'var(--text-3)' }}>불러오는 중...</p>
          ) : entries.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">📝</p>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>아직 기록이 없어요</p>
              <button
                onClick={() => navigate('/boss')}
                className="mt-3 text-sm underline"
                style={{ color: 'var(--primary)' }}
              >첫 기록 추가하기</button>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-2)', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th className="px-3 py-2 text-left text-xs font-medium" style={{ ...thStyle, width: '56px' }}>유형</th>
                    <th className="px-3 py-2 text-left text-xs font-medium" style={thStyle}>내역</th>
                    <th className="px-3 py-2 text-right text-xs font-medium" style={{ ...thStyle, width: '110px' }}>메소</th>
                    <th className="px-3 py-2 text-right text-xs font-medium" style={{ color: '#a78bfa', width: '72px' }}>🔮 조각</th>
                    <th style={{ width: '56px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, i) => {
                    const isLast = i === displayRows.length - 1
                    if (row.type === 'boss_group') {
                      return (
                        <BossGroupRows
                          key={row.bossEntry.id}
                          bossEntry={row.bossEntry}
                          dopings={row.dopings}
                          onDelete={() => handleDeleteEntry(row.bossEntry.id)}
                          onEdit={() => openEditEntry(row.bossEntry)}
                          isLast={isLast}
                        />
                      )
                    }
                    if (row.type === 'kill_group') {
                      return (
                        <KillGroupRows
                          key={`kill-${row.kill.id}`}
                          kill={row.kill}
                          dopings={row.dopings}
                          isLast={isLast}
                          showIncome={!['doping', 'expense'].includes(filter)}
                        />
                      )
                    }
                    return (
                      <EntryTableRow
                        key={row.entry.id}
                        entry={row.entry}
                        onDelete={() => handleDeleteEntry(row.entry.id)}
                        onEdit={() => openEditEntry(row.entry)}
                        isLast={isLast}
                      />
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 오른쪽: 차트 + 누적 */}
        <div className="lg:col-span-2 space-y-4">

          {chartData.length > 0 && (
            <div className="rounded-xl p-4" style={panelStyle}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>📈 주간 수익 추이</h3>
              <ResponsiveContainer width="100%" height={148}>
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
                      backgroundColor: 'var(--surface-2)',
                      border: '1px solid var(--border-2)',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    cursor={{ fill: 'var(--primary-dim)' }}
                  />
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(240,246,252,0.06)" vertical={false} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '10px', color: 'var(--text-2)' }} />
                  <Bar dataKey="수입" fill="#3fb950" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="지출" fill="#f85149" radius={[3, 3, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="rounded-xl p-4" style={panelStyle}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>📋 전체 누적</h3>
            <div className="space-y-2">
              {[
                { label: '총 수입', value: cumulativeIncome, color: 'var(--green)', prefix: '+' },
                { label: '총 지출', value: cumulativeExpense, color: 'var(--red)', prefix: '-' },
                { label: '총 순수익', value: cumulativeNet, color: cumulativeNet >= 0 ? 'var(--primary)' : 'var(--red)', prefix: cumulativeNet >= 0 ? '+' : '' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-2 px-3 rounded-lg"
                  style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>{item.label}</span>
                  <span className="text-sm font-bold" style={{ color: item.color }}>
                    {item.prefix}{formatMeso(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 드랍 아이템 */}
      <div className="rounded-xl overflow-hidden" style={panelStyle}>
        <div className="dark-panel-header">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            📦 {isThisWeek ? '이번 주' : '해당 주'} 드랍 아이템
          </h3>
        </div>
        {dropsLoading ? (
          <p className="text-sm text-center py-6 animate-pulse" style={{ color: 'var(--text-3)' }}>불러오는 중...</p>
        ) : drops.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>드랍 기록이 없어요</p>
        ) : (
          <div className="p-3 space-y-2">
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
                            ? { backgroundColor: 'rgba(74,222,128,0.12)', color: 'var(--green)' }
                            : drop.status === 'listed'
                            ? { backgroundColor: 'rgba(234,179,8,0.12)', color: '#fbbf24' }
                            : { backgroundColor: 'var(--primary-dim)', color: 'var(--primary)' }
                        }
                      >
                        {drop.status === 'sold' ? '✅ 판매 완료' : drop.status === 'listed' ? '🏪 경매장 등록 중' : '📦 보유 중'}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                      {drop.bossName} {difficultyLabel(drop.difficulty)}{drop.characterName && ` • ${drop.characterName}`}
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
                      className="text-xs px-2.5 py-1.5 rounded-lg shrink-0 font-medium"
                      style={{ backgroundColor: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
                    >경매장 등록</button>
                  )}
                  {drop.status === 'listed' && (
                    <button
                      onClick={() => { setSellingId(drop.id); setSellForm({ saleAmount: '', saleDate: toDateString(), isPcCafe: false }) }}
                      className="text-xs px-2.5 py-1.5 rounded-lg shrink-0 font-medium"
                      style={{ backgroundColor: 'var(--primary-dim)', color: 'var(--primary)', border: '1px solid var(--primary-glow)' }}
                    >판매 처리</button>
                  )}
                </div>

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
                    <QuickAmountButtons
                      onAdd={(v) => setSellForm((p) => ({ ...p, saleAmount: String((Number(p.saleAmount) || 0) + v) }))}
                    />
                    {(() => {
                      const saleAmt = Number(sellForm.saleAmount)
                      const isSilverPlus = ['SILVER','GOLD','DIAMOND','RED','BLACK'].includes(user?.mvpGrade ?? '')
                      const isDiscounted = sellForm.isPcCafe || isSilverPlus
                      const feeRate = isDiscounted ? 0.03 : 0.05
                      const net = saleAmt * (1 - feeRate)
                      if (!saleAmt) return null
                      return (
                        <div className="space-y-1 text-xs" style={{ color: 'var(--text-2)' }}>
                          {!user?.mvpGrade || user.mvpGrade === 'NORMAL' ? (
                            <p style={{ color: 'var(--text-3)' }}>
                              MVP 등급 미설정 — 수수료 5% 적용.{' '}
                              <a href="/settings" className="underline" style={{ color: 'var(--primary)' }}>설정에서 변경 →</a>
                            </p>
                          ) : (
                            <p>MVP: {user.mvpGrade} · 수수료 {(feeRate * 100).toFixed(0)}%{isDiscounted ? ' (실버+ / PC방)' : ''}</p>
                          )}
                          <p className="font-semibold" style={{ color: 'var(--green)' }}>
                            예상 실수령: {formatMeso(Math.floor(net))} 메소
                          </p>
                        </div>
                      )
                    })()}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sellForm.isPcCafe}
                        onChange={(e) => setSellForm((p) => ({ ...p, isPcCafe: e.target.checked }))}
                        className="w-3.5 h-3.5"
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span className="text-xs" style={{ color: 'var(--text-2)' }}>
                        PC방 접속 중 (수수료 3% 적용)
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" loading={sellSubmitting} className="flex-1">판매 완료 처리</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSellingId(null)}>취소</Button>
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
      </div>

      {/* 주별 기록 테이블 (솔 에르다 조각 + 항목 수 컬럼 포함) */}
      <div className="rounded-xl overflow-hidden" style={panelStyle}>
        <div className="dark-panel-header">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>📜 주별 기록</h3>
        </div>
        {allWeeksLoading ? (
          <p className="text-sm text-center py-6 animate-pulse" style={{ color: 'var(--text-3)' }}>불러오는 중...</p>
        ) : allWeeks.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>아직 기록이 없어요</p>
        ) : (
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-2)', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th className="px-4 py-2 text-left text-xs font-medium" style={thStyle}>주차</th>
                  <th className="px-3 py-2 text-right text-xs font-medium" style={thStyle}>수입</th>
                  <th className="px-3 py-2 text-right text-xs font-medium" style={thStyle}>지출</th>
                  <th className="px-3 py-2 text-right text-xs font-medium" style={thStyle}>순수익</th>
                  <th className="px-3 py-2 text-right text-xs font-medium" style={{ color: '#a78bfa' }}>🔮 조각</th>
                  <th className="px-4 py-2 text-right text-xs font-medium" style={thStyle}>항목</th>
                </tr>
              </thead>
              <tbody>
                {[...allWeeks].reverse().map((w, i, arr) => {
                  const net = w.totalIncome - w.totalExpense
                  const isCurrent = weekStartStr === w.weekStart
                  return (
                    <tr
                      key={w.weekStart}
                      onClick={() => jumpToWeek(w.weekStart)}
                      className="table-row cursor-pointer"
                      style={{
                        backgroundColor: isCurrent ? 'var(--primary-dim)' : undefined,
                        borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border)',
                      }}
                    >
                      <td className="px-4 py-2.5">
                        <span className="text-sm font-medium" style={{ color: isCurrent ? 'var(--primary)' : 'var(--text)' }}>
                          {w.weekStart.slice(5).replace('-', '/')} 주
                          {isCurrent && (
                            <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--primary)' }}>← 현재</span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-sm" style={{ color: 'var(--green)' }}>+{formatMeso(w.totalIncome)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-sm" style={{ color: 'var(--red)' }}>-{formatMeso(w.totalExpense)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-sm font-bold" style={{ color: net >= 0 ? 'var(--primary)' : 'var(--red)' }}>
                          {net >= 0 ? '+' : ''}{formatMeso(net)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {(w.totalSolErdaFragments ?? 0) > 0
                          ? <span className="text-xs font-semibold" style={{ color: '#c4b5fd' }}>{w.totalSolErdaFragments ?? 0}개</span>
                          : <span style={{ color: 'var(--text-3)', fontSize: '10px' }}>—</span>
                        }
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                          {w.entryCount != null ? `${w.entryCount}건` : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 수익 구성 비율 */}
      <div className="rounded-xl overflow-hidden" style={panelStyle}>
        <div className="dark-panel-header">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>📊 수익 구성 비율 (최근 4주)</h3>
        </div>
        {statsLoading ? (
          <p className="text-sm text-center py-6 animate-pulse" style={{ color: 'var(--text-3)' }}>불러오는 중...</p>
        ) : (() => {
          const incomeStats = catStats.filter((s) => s.type === 'income')
          const byCategory = Object.fromEntries(incomeStats.map((s) => [s.category, safeNum(s.total)]))
          const bossAuction = safeNum(byCategory['boss']) + safeNum(byCategory['auction'])
          const huntingSolErda = safeNum(byCategory['hunting']) + safeNum(byCategory['sol_erda'])
          const totalIncome = Object.values(byCategory).reduce((a, b) => a + b, 0)
          const bossAuctionPct = totalIncome > 0 ? (bossAuction / totalIncome) * 100 : 0
          const huntingSolErdaPct = totalIncome > 0 ? (huntingSolErda / totalIncome) * 100 : 0
          if (totalIncome === 0) {
            return <p className="text-xs text-center py-6" style={{ color: 'var(--text-3)' }}>데이터 없음</p>
          }
          return (
            <div className="p-4 space-y-4">
              {[
                { label: '⚔️ 보스 + 경매장', value: bossAuction, pct: bossAuctionPct, color: 'var(--primary)', gradient: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)' },
                { label: '🌲 사냥 + 솔 에르다', value: huntingSolErda, pct: huntingSolErdaPct, color: 'var(--green)', gradient: 'var(--green)' },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>{row.label}</span>
                    <span className="text-xs font-bold" style={{ color: row.color }}>{row.pct.toFixed(1)}%</span>
                  </div>
                  <div className="rounded-full h-3 overflow-hidden" style={{ backgroundColor: 'var(--surface-2)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${row.pct}%`, background: row.gradient }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{formatMeso(row.value)}</p>
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* 캐릭터 현황 */}
      {characters.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={panelStyle}>
          <div className="dark-panel-header">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>🧙 캐릭터 현황</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-2)', position: 'sticky', top: 0 }}>
                  {['캐릭터', '직업', '레벨', '주간 보스', '🔮 솔 에르다 조각'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium" style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {characters.map((c, i) => {
                  const bossCount = charBossCounts.get(c.id) ?? 0
                  const bossColor = bossCount >= 12 ? 'var(--green)' : bossCount === 0 ? 'var(--text-3)' : '#60a5fa'
                  return (
                  <tr
                    key={c.id}
                    className="table-row"
                    style={{ borderBottom: i === characters.length - 1 ? 'none' : '1px solid var(--border)' }}
                  >
                    <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--text)' }}>
                      {c.isMain ? '⭐ ' : ''}{c.name}
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-3)' }}>{c.jobClass ?? '—'}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-3)' }}>{c.level > 0 ? `Lv.${c.level}` : '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-sm font-semibold" style={{ color: bossColor }}>
                        {bossCount}/12
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-sm font-semibold" style={{ color: '#c4b5fd' }}>
                        {(c.solErdaFragments ?? 0).toLocaleString()}개
                      </span>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 캐릭터별 수입/지출 */}
      {charStats.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={panelStyle}>
          <div className="dark-panel-header">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>📊 캐릭터별 수입/지출</h3>
          </div>

          {/* 차트 */}
          {charStats.some(s => s.totalIncome > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-2)' }}>캐릭터별 수입 분포</p>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={charStats.filter(s => s.totalIncome > 0).map(s => ({ name: s.characterName, value: s.totalIncome }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={68}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {charStats.filter(s => s.totalIncome > 0).map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => formatMeso(v as number)}
                      contentStyle={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: '8px', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
                  {charStats.filter(s => s.totalIncome > 0).map((s, idx) => (
                    <span key={s.characterId} className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-3)' }}>
                      <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      {s.characterName}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-2)' }}>수입 vs 지출 비교</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={charStats.map(s => ({ name: s.characterName, 수입: s.totalIncome, 지출: s.totalExpense }))}
                    margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                  >
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v) => formatMeso(v as number)}
                      contentStyle={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: '8px', fontSize: '11px' }}
                      cursor={{ fill: 'var(--primary-dim)' }}
                    />
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(240,246,252,0.06)" vertical={false} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '10px', color: 'var(--text-2)' }} />
                    <Bar dataKey="수입" fill="#3fb950" radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="지출" fill="#f85149" radius={[3, 3, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-2)', position: 'sticky', top: 0 }}>
                  {['캐릭터', '누적 수입', '누적 지출', '순이익'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium" style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {charStats.map((s, i) => (
                  <tr
                    key={s.characterId}
                    className="table-row"
                    style={{ borderBottom: i === charStats.length - 1 ? 'none' : '1px solid var(--border)' }}
                  >
                    <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--text)' }}>
                      {s.isMain ? '⭐ ' : ''}{s.characterName}
                    </td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--green)' }}>
                      {formatMeso(s.totalIncome)}
                    </td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--red)' }}>
                      {formatMeso(s.totalExpense)}
                    </td>
                    <td className="px-3 py-2.5 font-bold" style={{ color: s.netProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {s.netProfit >= 0 ? '+' : ''}{formatMeso(s.netProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 수정 모달 ── */}
      {editingEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditingEntry(null) }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-md space-y-4"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base" style={{ color: 'var(--text)' }}>✏️ 항목 수정</h2>
              <button
                onClick={() => setEditingEntry(null)}
                className="text-sm w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ color: 'var(--text-3)', backgroundColor: 'var(--surface-2)' }}
              >✕</button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="유형"
                  value={editForm.type}
                  onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value as EntryType }))}
                  options={[
                    { value: 'income', label: '수입' },
                    { value: 'expense', label: '지출' },
                  ]}
                />
                <Select
                  label="카테고리"
                  value={editForm.category}
                  onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value as EntryCategory }))}
                  options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="금액 (메소)"
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                  min={0}
                />
                <Input
                  label="날짜"
                  type="date"
                  value={editForm.entryDate}
                  onChange={(e) => setEditForm((p) => ({ ...p, entryDate: e.target.value }))}
                />
              </div>
              {editForm.amount && Number(editForm.amount) > 0 && (
                <p className="text-xs pl-1" style={{ color: 'var(--text-2)' }}>
                  = {formatMeso(Number(editForm.amount))} 메소
                </p>
              )}
              <Input
                label="설명 (선택)"
                placeholder="메모"
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              />
              {characters.length > 0 && (
                <Select
                  label="캐릭터 (선택)"
                  value={editForm.characterId}
                  onChange={(e) => setEditForm((p) => ({ ...p, characterId: e.target.value }))}
                  options={[
                    { value: '', label: '선택 안함' },
                    ...characters.map((c) => ({ value: String(c.id), label: c.name })),
                  ]}
                />
              )}
              {editForm.type === 'income' && editForm.category === 'hunting' && (
                <Input
                  label="솔 에르다 조각 개수 (선택)"
                  type="number"
                  placeholder="획득한 조각 수"
                  value={editForm.solErdaFragments}
                  onChange={(e) => setEditForm((p) => ({ ...p, solErdaFragments: e.target.value }))}
                  min={0}
                />
              )}
              <div className="flex gap-2 justify-end pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingEntry(null)}>취소</Button>
                <Button type="submit" size="sm" loading={editSubmitting}>저장</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function EntryTableRow({
  entry,
  onDelete,
  onEdit,
  isLast,
}: {
  entry: LedgerEntry
  onDelete: () => void
  onEdit: () => void
  isLast: boolean
}) {
  const categoryKey = (entry.category ?? '').toLowerCase()
  const icon = CATEGORY_ICONS[categoryKey] ?? '💫'
  const label = CATEGORY_LABELS[categoryKey] ?? entry.category
  const isIncome = (entry.type ?? '').toLowerCase() === 'income'
  const erdaCount = entry.solErdaFragments ?? 0
  const catColors = CATEGORY_COLORS[categoryKey] ?? CATEGORY_COLORS.other

  return (
    <tr
      className="table-row"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}
    >
      <td className="px-3 py-2.5">
        <span
          className="text-xs px-1.5 py-0.5 rounded font-medium"
          style={{
            whiteSpace: 'nowrap',
            ...(isIncome
              ? { color: 'var(--green)', backgroundColor: 'rgba(74,222,128,0.1)' }
              : { color: 'var(--red)', backgroundColor: 'rgba(248,113,113,0.1)' }),
          }}
        >
          {isIncome ? '수입' : '지출'}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none shrink-0">{icon}</span>
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
                className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ backgroundColor: catColors.bg, color: catColors.color }}
              >
                {label}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        <span
          className="font-bold text-sm"
          style={{ color: isIncome ? 'var(--green)' : 'var(--red)' }}
          title={entry.amount.toLocaleString() + ' 메소'}
        >
          {isIncome ? '+' : '-'}{formatMeso(entry.amount)}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        {erdaCount > 0
          ? <span className="text-xs font-semibold" style={{ color: '#c4b5fd' }}>{erdaCount}개</span>
          : <span style={{ color: 'var(--text-3)', fontSize: '10px' }}>—</span>
        }
      </td>
      <td className="px-2 py-2.5" style={{ whiteSpace: 'nowrap' }}>
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onEdit}
            className="text-xs px-2 py-0.5 rounded-md font-semibold"
            style={{
              color: 'var(--primary)',
              backgroundColor: 'var(--primary-dim)',
              border: '1px solid var(--primary-glow)',
            }}
          >수정</button>
          <button
            onClick={onDelete}
            title="삭제"
            className="w-5 h-5 flex items-center justify-center rounded text-xs"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
          >✕</button>
        </div>
      </td>
    </tr>
  )
}

function BossGroupRows({
  bossEntry,
  dopings,
  onDelete,
  onEdit,
  isLast,
}: {
  bossEntry: LedgerEntry
  dopings: LedgerEntry[]
  onDelete: () => void
  onEdit: () => void
  isLast: boolean
}) {
  const hasDopings = dopings.length > 0
  const dopingTotal = dopings.reduce((s, d) => s + d.amount, 0)
  const net = bossEntry.amount - dopingTotal
  const erdaCount = bossEntry.solErdaFragments ?? 0

  return (
    <>
      <tr
        className="table-row"
        style={{ borderBottom: hasDopings ? '1px solid rgba(240,246,252,0.08)' : (isLast ? 'none' : '1px solid var(--border)') }}
      >
        <td className="px-3 py-2.5">
          <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ whiteSpace: 'nowrap', color: 'var(--green)', backgroundColor: 'rgba(74,222,128,0.1)' }}>수입</span>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none shrink-0">⚔️</span>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{bossEntry.description || '보스'}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {formatDateKo(bossEntry.entryDate)}{bossEntry.characterName && ` · ${bossEntry.characterName}`}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(249,115,22,0.12)', color: 'var(--primary)' }}>보스</span>
                {hasDopings && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(168,85,247,0.12)', color: '#a855f7' }}>
                    도핑 {dopings.length}개
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5 text-right whitespace-nowrap">
          <span className="font-bold text-sm" style={{ color: 'var(--green)' }}>+{formatMeso(bossEntry.amount)}</span>
        </td>
        <td className="px-3 py-2.5 text-right">
          {erdaCount > 0
            ? <span className="text-xs font-semibold" style={{ color: '#c4b5fd' }}>{erdaCount}개</span>
            : <span style={{ color: 'var(--text-3)', fontSize: '10px' }}>—</span>}
        </td>
        <td className="px-2 py-2.5">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={onEdit}
              className="text-xs px-2 py-0.5 rounded-md font-semibold"
              style={{ color: 'var(--primary)', backgroundColor: 'var(--primary-dim)', border: '1px solid var(--primary-glow)' }}
            >수정</button>
            <button
              onClick={onDelete}
              title="삭제"
              className="w-5 h-5 flex items-center justify-center rounded text-xs"
              style={{ color: 'var(--text-3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
            >✕</button>
          </div>
        </td>
      </tr>

      {dopings.map((d) => (
        <tr key={d.id} style={{ borderBottom: '1px solid rgba(240,246,252,0.04)', backgroundColor: 'rgba(168,85,247,0.04)' }}>
          <td className="px-3 py-1.5">
            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ whiteSpace: 'nowrap', color: 'var(--red)', backgroundColor: 'rgba(248,113,113,0.1)' }}>지출</span>
          </td>
          <td className="px-3 py-1.5">
            <div className="flex items-center gap-2 pl-3">
              <span className="text-sm leading-none shrink-0">└ 💊</span>
              <span className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{d.description || '도핑'}</span>
            </div>
          </td>
          <td className="px-3 py-1.5 text-right">
            <span className="text-xs font-semibold" style={{ color: 'var(--red)' }}>-{formatMeso(d.amount)}</span>
          </td>
          <td className="px-3 py-1.5 text-right">
            <span style={{ color: 'var(--text-3)', fontSize: '10px' }}>—</span>
          </td>
          <td />
        </tr>
      ))}

      {hasDopings && (
        <tr style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
          <td />
          <td className="px-3 py-1.5 text-right" colSpan={2}>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>
              보스 순수익:{' '}
              <span className="font-semibold" style={{ color: net >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {net >= 0 ? '+' : ''}{formatMeso(net)}
              </span>
            </span>
          </td>
          <td />
          <td />
        </tr>
      )}
    </>
  )
}

function KillGroupRows({
  kill,
  dopings,
  isLast,
  showIncome = true,
}: {
  kill: BossKill
  dopings: LedgerEntry[]
  isLast: boolean
  showIncome?: boolean
}) {
  const dopingTotal = dopings.reduce((s, d) => s + d.amount, 0)
  const bossIncome = kill.income ?? kill.crystalPrice
  const net = bossIncome - dopingTotal
  const bossLabel = `${kill.bossName} ${difficultyLabel(kill.difficulty)}`

  return (
    <>
      {showIncome ? (
        <tr
          className="table-row"
          style={{ borderBottom: dopings.length > 0 ? '1px solid rgba(240,246,252,0.08)' : (isLast ? 'none' : '1px solid var(--border)') }}
        >
          <td className="px-3 py-2.5">
            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ whiteSpace: 'nowrap', color: 'var(--green)', backgroundColor: 'rgba(74,222,128,0.1)' }}>수입</span>
          </td>
          <td className="px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none shrink-0">⚔️</span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{bossLabel} 결정석</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(249,115,22,0.12)', color: 'var(--primary)' }}>보스</span>
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(168,85,247,0.12)', color: '#a855f7' }}>
                    도핑 {dopings.length}개
                  </span>
                </div>
              </div>
            </div>
          </td>
          <td className="px-3 py-2.5 text-right whitespace-nowrap">
            <span className="font-bold text-sm" style={{ color: 'var(--green)' }}>+{formatMeso(bossIncome)}</span>
          </td>
          <td className="px-3 py-2.5 text-right">
            <span style={{ color: 'var(--text-3)', fontSize: '10px' }}>—</span>
          </td>
          <td className="px-2 py-2.5" />
        </tr>
      ) : (
        <tr style={{ borderBottom: dopings.length > 0 ? '1px solid rgba(240,246,252,0.08)' : (isLast ? 'none' : '1px solid var(--border)') }}>
          <td className="px-3 py-2" colSpan={4}>
            <div className="flex items-center gap-2">
              <span className="text-base leading-none shrink-0">⚔️</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{bossLabel}</span>
              <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(168,85,247,0.12)', color: '#a855f7' }}>
                도핑 {dopings.length}개
              </span>
            </div>
          </td>
          <td />
        </tr>
      )}

      {dopings.map((d) => (
        <tr key={d.id} style={{ borderBottom: '1px solid rgba(240,246,252,0.04)', backgroundColor: 'rgba(168,85,247,0.04)' }}>
          <td className="px-3 py-1.5">
            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ whiteSpace: 'nowrap', color: 'var(--red)', backgroundColor: 'rgba(248,113,113,0.1)' }}>지출</span>
          </td>
          <td className="px-3 py-1.5">
            <div className="flex items-center gap-2 pl-3">
              <span className="text-sm leading-none shrink-0">└ 💊</span>
              <span className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{d.description || '도핑'}</span>
            </div>
          </td>
          <td className="px-3 py-1.5 text-right">
            <span className="text-xs font-semibold" style={{ color: 'var(--red)' }}>-{formatMeso(d.amount)}</span>
          </td>
          <td className="px-3 py-1.5 text-right">
            <span style={{ color: 'var(--text-3)', fontSize: '10px' }}>—</span>
          </td>
          <td />
        </tr>
      ))}

      {showIncome && dopings.length > 0 && (
        <tr style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
          <td />
          <td className="px-3 py-1.5 text-right" colSpan={2}>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>
              보스 순수익:{' '}
              <span className="font-semibold" style={{ color: net >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {net >= 0 ? '+' : ''}{formatMeso(net)}
              </span>
            </span>
          </td>
          <td />
          <td />
        </tr>
      )}
    </>
  )
}
