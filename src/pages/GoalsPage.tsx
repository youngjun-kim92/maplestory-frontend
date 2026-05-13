import { useState, useEffect, useCallback } from 'react'
import { Target } from 'lucide-react'
import { goalsApi } from '../api/goals'
import type { Goal, GoalEstimate } from '../types'
import { formatMeso } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [estimates, setEstimates] = useState<Record<number, GoalEstimate>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [form, setForm] = useState({ itemName: '', targetAmount: '' })

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await goalsApi.getGoals()
      setGoals(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const loadEstimate = async (goalId: number) => {
    if (estimates[goalId]) return
    try {
      const res = await goalsApi.getGoalEstimate(goalId)
      setEstimates((p) => ({ ...p, [goalId]: res.data }))
    } catch {
      // 데이터 부족 시 무시
    }
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form.itemName || !form.targetAmount) return
    setSubmitting(true)
    try {
      if (editingId) {
        await goalsApi.updateGoal(editingId, {
          itemName: form.itemName,
          targetAmount: Number(form.targetAmount),
        })
      } else {
        await goalsApi.createGoal({
          itemName: form.itemName,
          targetAmount: Number(form.targetAmount),
        })
      }
      setForm({ itemName: '', targetAmount: '' })
      setShowForm(false)
      setEditingId(null)
      await fetchGoals()
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (goal: Goal) => {
    setForm({ itemName: goal.itemName, targetAmount: String(goal.targetAmount) })
    setEditingId(goal.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('이 목표를 삭제하시겠습니까?')) return
    await goalsApi.deleteGoal(id)
    await fetchGoals()
  }

  const handleAchieve = async (id: number) => {
    await goalsApi.markAchieved(id)
    await fetchGoals()
  }

  const activeGoals = goals.filter((g) => !g.achieved)
  const achievedGoals = goals.filter((g) => g.achieved)

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-orange-400 animate-pulse">불러오는 중...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-heading flex items-center gap-2" style={{ color: 'var(--text)' }}><Target size={22} strokeWidth={1.75} />목표 아이템</h1>
        <Button
          onClick={() => {
            setShowForm((v) => !v)
            setEditingId(null)
            setForm({ itemName: '', targetAmount: '' })
          }}
          size="sm"
        >
          {showForm ? '취소' : '+ 목표 추가'}
        </Button>
      </div>

      {/* 목표 추가/수정 폼 */}
      {showForm && (
        <Card title={editingId ? '목표 수정' : '새 목표 추가'} icon={<Target size={18} strokeWidth={1.75} />}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="아이템 이름"
              placeholder="예: 에테르넬 완드"
              value={form.itemName}
              onChange={(e) => setForm((p) => ({ ...p, itemName: e.target.value }))}
              autoFocus
            />
            <Input
              label="목표 금액 (메소)"
              type="number"
              placeholder="예: 5000000000"
              value={form.targetAmount}
              onChange={(e) => setForm((p) => ({ ...p, targetAmount: e.target.value }))}
              min={1}
            />
            {form.targetAmount && (
              <p className="text-orange-400 text-xs">
                = {formatMeso(Number(form.targetAmount))}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>취소</Button>
              <Button type="submit" loading={submitting}>
                {editingId ? '수정하기' : '추가하기'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 진행 중인 목표 */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <span>진행 중인 목표</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--orange-dim)', color: 'var(--orange-light)' }}>
            {activeGoals.length}
          </span>
        </h2>
        {activeGoals.length === 0 ? (
          <Card>
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-3)' }}>
              목표 아이템을 추가해보세요!
            </p>
          </Card>
        ) : (
          activeGoals.map((goal) => {
            const est = estimates[goal.id]
            return (
              <Card key={goal.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base" style={{ color: 'var(--text)' }}>{goal.itemName}</h3>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--orange-light)' }}>{formatMeso(goal.targetAmount)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <button onClick={() => handleEdit(goal)} className="text-xs transition-colors" style={{ color: 'var(--text-2)' }}>수정</button>
                    <button onClick={() => handleAchieve(goal.id)} className="text-xs transition-colors" style={{ color: 'var(--green)' }}>달성 ✓</button>
                    <button onClick={() => handleDelete(goal.id)} className="text-xs transition-colors" style={{ color: 'var(--text-3)' }}>삭제</button>
                  </div>
                </div>

                {/* 달성 예측 (기능 #6) */}
                {!est ? (
                  <button
                    onClick={() => loadEstimate(goal.id)}
                    className="mt-3 text-xs underline transition-colors"
                    style={{ color: 'var(--text-2)' }}
                  >
                    달성 예측 보기
                  </button>
                ) : (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="info-box">
                        <p className="text-xs" style={{ color: 'var(--text-2)' }}>현재 저축</p>
                        <p className="font-medium text-sm mt-0.5" style={{ color: 'var(--text)' }}>{formatMeso(est.currentSavings)}</p>
                      </div>
                      <div className="info-box">
                        <p className="text-xs" style={{ color: 'var(--text-2)' }}>남은 금액</p>
                        <p className="font-medium text-sm mt-0.5" style={{ color: 'var(--orange-light)' }}>{formatMeso(est.remaining)}</p>
                      </div>
                      <div className="info-box">
                        <p className="text-xs" style={{ color: 'var(--text-2)' }}>주간 평균 수익</p>
                        <p className="font-medium text-sm mt-0.5" style={{ color: 'var(--green)' }}>{formatMeso(est.avgWeeklyNet)}</p>
                      </div>
                      <div className="info-box">
                        <p className="text-xs" style={{ color: 'var(--text-2)' }}>예상 달성</p>
                        <p className="font-medium text-sm mt-0.5" style={{ color: '#60a5fa' }}>
                          {est.weeksRemaining > 0 ? `약 ${est.weeksRemaining}주 후` : '이미 달성 가능!'}
                        </p>
                      </div>
                    </div>
                    {est.estimatedDate && (
                      <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-2)' }}>
                        예상 날짜: {est.estimatedDate}
                      </p>
                    )}
                    {est.targetAmount > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-2)' }}>
                          <span>진행률</span>
                          <span>{Math.min(100, Math.round((est.currentSavings / est.targetAmount) * 100))}%</span>
                        </div>
                        <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--border-2)' }}>
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (est.currentSavings / est.targetAmount) * 100)}%`,
                              background: 'linear-gradient(90deg, #f97316, #fb923c)',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* 달성한 목표 */}
      {achievedGoals.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-medium text-sm" style={{ color: 'var(--text-2)' }}>달성한 목표 ✅</h2>
          {achievedGoals.map((goal) => (
            <div
              key={goal.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl opacity-60"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div>
                <p className="font-medium text-sm line-through" style={{ color: 'var(--text-2)' }}>{goal.itemName}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{formatMeso(goal.targetAmount)}</p>
              </div>
              <span className="text-sm" style={{ color: 'var(--green)' }}>✅ 달성</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
