import { useState, useEffect, useCallback } from 'react'
import { Target } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, // Cell used inside Pie
} from 'recharts'
import { ledgerApi } from '../api/ledger'
import { goalsApi } from '../api/goals'
import type { Goal, GoalEstimate, IncomeTrend } from '../types'
import { formatMeso, formatDate } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const PIE_COLORS = ['#E87E1E', '#16A34A', '#3B82F6', '#A855F7']

export default function StatsPage() {
  const [trend, setTrend] = useState<IncomeTrend[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [estimates, setEstimates] = useState<Record<number, GoalEstimate>>({})
  const [loading, setLoading] = useState(true)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalForm, setGoalForm] = useState({ itemName: '', targetAmount: '' })
  const [goalSubmitting, setGoalSubmitting] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [trendRes, goalsRes] = await Promise.all([
        ledgerApi.getIncomeTrend(8),
        goalsApi.getGoals(),
      ])
      setTrend(trendRes.data)
      setGoals(goalsRes.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const loadEstimate = async (goalId: number) => {
    if (estimates[goalId]) return
    try {
      const res = await goalsApi.getGoalEstimate(goalId)
      setEstimates((p) => ({ ...p, [goalId]: res.data }))
    } catch { /* 데이터 부족 */ }
  }

  useEffect(() => {
    goals.filter((g) => !g.achieved).forEach((g) => loadEstimate(g.id))
  }, [goals]) // eslint-disable-line

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goalForm.itemName || !goalForm.targetAmount) return
    setGoalSubmitting(true)
    try {
      await goalsApi.createGoal({ itemName: goalForm.itemName, targetAmount: Number(goalForm.targetAmount) })
      setGoalForm({ itemName: '', targetAmount: '' })
      setShowGoalForm(false)
      await fetchAll()
    } finally {
      setGoalSubmitting(false)
    }
  }

  const handleAchieve = async (id: number) => {
    await goalsApi.markAchieved(id)
    await fetchAll()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('목표를 삭제하시겠습니까?')) return
    await goalsApi.deleteGoal(id)
    await fetchAll()
  }

  const chartData = trend.map((t) => ({
    week: formatDate(t.weekStart),
    보스: t.bossIncome,
    사냥: t.huntingIncome,
    경매장: t.auctionIncome,
  }))

  const pieData = (() => {
    if (!trend.length) return []
    const slice = trend.slice(-4)
    const boss    = slice.reduce((s, t) => s + t.bossIncome, 0)
    const hunting = slice.reduce((s, t) => s + t.huntingIncome, 0)
    const auction = slice.reduce((s, t) => s + t.auctionIncome, 0)
    const other   = slice.reduce((s, t) => s + Math.max(0, t.totalIncome - t.bossIncome - t.huntingIncome - t.auctionIncome), 0)
    return [
      { name: '보스', value: boss },
      { name: '사냥', value: hunting },
      { name: '경매장', value: auction },
      { name: '기타', value: other },
    ].filter((d) => d.value > 0)
  })()

  const activeGoals   = goals.filter((g) => !g.achieved)
  const achievedGoals = goals.filter((g) => g.achieved)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold font-diary" style={{ color: 'var(--text)' }}>
        📊 통계
      </h1>

      {/* Income trend line chart */}
      <Card title="주간 수익 추이 (최근 8주)" icon="📈">
        {loading ? (
          <p className="text-sm text-center py-10 animate-pulse" style={{ color: 'var(--text-3)' }}>
            불러오는 중...
          </p>
        ) : trend.length < 2 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">📉</p>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              2주 이상 기록이 쌓이면 차트가 표시됩니다.
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} tickFormatter={(v) => formatMeso(v)} width={55} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}
                  labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                  formatter={(v) => [(v as number).toLocaleString() + ' 메소']}
                />
                <Line type="monotone" dataKey="보스"   stroke="#E87E1E" strokeWidth={2.5} dot={{ r: 3, fill: '#E87E1E' }} />
                <Line type="monotone" dataKey="사냥"   stroke="#16A34A" strokeWidth={2.5} dot={{ r: 3, fill: '#16A34A' }} />
                <Line type="monotone" dataKey="경매장" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3, fill: '#3B82F6' }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-5 mt-2">
              {[{ label: '보스', color: '#E87E1E' }, { label: '사냥', color: '#16A34A' }, { label: '경매장', color: '#3B82F6' }].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-2)' }}>
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color, display: 'inline-block' }} />
                  {l.label}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Pie chart */}
      {pieData.length > 0 && (
        <Card title="최근 4주 수익 비율" icon="🥧">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                outerRadius={75}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
                fontSize={11}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [(v as number).toLocaleString() + ' 메소']} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Goals section */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold font-diary flex items-center gap-1.5" style={{ color: 'var(--text)' }}><Target size={18} strokeWidth={1.75} />목표 아이템</h2>
        <Button size="sm" onClick={() => setShowGoalForm((v) => !v)}>
          {showGoalForm ? '취소' : '+ 목표 추가'}
        </Button>
      </div>

      {showGoalForm && (
        <Card>
          <form onSubmit={handleAddGoal} className="space-y-3">
            <Input
              label="목표 아이템"
              placeholder="예: 드래곤 로어"
              value={goalForm.itemName}
              onChange={(e) => setGoalForm((p) => ({ ...p, itemName: e.target.value }))}
              autoFocus
            />
            <Input
              label="목표 금액 (메소)"
              type="number"
              placeholder="예: 5000000000"
              value={goalForm.targetAmount}
              onChange={(e) => setGoalForm((p) => ({ ...p, targetAmount: e.target.value }))}
              min={1}
            />
            {goalForm.targetAmount && (
              <p className="text-xs pl-1" style={{ color: 'var(--text-2)' }}>
                = {formatMeso(Number(goalForm.targetAmount))}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowGoalForm(false)}>취소</Button>
              <Button type="submit" size="sm" loading={goalSubmitting}>추가하기</Button>
            </div>
          </form>
        </Card>
      )}

      {activeGoals.length === 0 && !showGoalForm && (
        <Card>
          <div className="text-center py-6">
            <div className="mb-2 flex justify-center opacity-30"><Target size={32} strokeWidth={1.5} /></div>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>목표 아이템을 추가해보세요!</p>
          </div>
        </Card>
      )}

      {activeGoals.map((goal) => {
        const est = estimates[goal.id]
        const pct = est ? Math.min(100, est.progressPercent) : 0
        return (
          <Card key={goal.id}>
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 mr-3">
                <p className="font-bold" style={{ color: 'var(--text)' }}>{goal.itemName}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                  목표: {formatMeso(goal.targetAmount)}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => handleAchieve(goal.id)}
                  className="text-xs px-2.5 py-1 rounded-lg font-medium"
                  style={{ backgroundColor: 'rgba(22,163,74,0.1)', color: 'var(--green)', border: '1px solid rgba(22,163,74,0.2)' }}
                >
                  달성 ✓
                </button>
                <button
                  onClick={() => handleDelete(goal.id)}
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="progress-track mb-3">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>

            {est ? (
              <>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="info-box text-center">
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-3)' }}>진행률</p>
                    <p className="font-bold text-sm" style={{ color: 'var(--primary)' }}>{pct.toFixed(1)}%</p>
                  </div>
                  <div className="info-box text-center">
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-3)' }}>남은 금액</p>
                    <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{formatMeso(est.remaining)}</p>
                  </div>
                  <div className="info-box text-center">
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-3)' }}>예상 기간</p>
                    <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>
                      {est.weeksRemaining > 0 ? `약 ${est.weeksRemaining}주` : '거의 완료!'}
                    </p>
                  </div>
                </div>
                {est.estimatedDate && est.weeksRemaining > 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                    🗓 예상 달성일: {est.estimatedDate.split('T')[0]}
                    &nbsp;·&nbsp;주간 평균 순수익 {formatMeso(est.avgWeeklyNet)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                주간 수익 데이터가 쌓이면 예측이 표시됩니다.
              </p>
            )}
          </Card>
        )
      })}

      {achievedGoals.length > 0 && (
        <Card title="달성한 목표 🏆" icon="✅">
          <div className="space-y-1.5">
            {achievedGoals.map((g) => (
              <div key={g.id} className="list-row">
                <div className="flex items-center gap-2">
                  <span>🏆</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{g.itemName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: 'var(--text-2)' }}>{formatMeso(g.targetAmount)}</span>
                  <button onClick={() => handleDelete(g.id)} className="text-xs" style={{ color: 'var(--text-3)' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
