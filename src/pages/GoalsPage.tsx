import { useState, useEffect, useCallback } from 'react'
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

  const handleSubmit = async (e: React.FormEvent) => {
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
        <h1 className="text-xl font-bold text-white">🎯 목표 아이템</h1>
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
        <Card title={editingId ? '목표 수정' : '새 목표 추가'} icon="🎯">
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
        <h2 className="text-white font-medium text-sm flex items-center gap-2">
          <span>진행 중인 목표</span>
          <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full">
            {activeGoals.length}
          </span>
        </h2>
        {activeGoals.length === 0 ? (
          <Card>
            <p className="text-slate-500 text-sm text-center py-4">
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
                    <h3 className="text-white font-semibold text-base">{goal.itemName}</h3>
                    <p className="text-orange-400 text-sm mt-0.5">{formatMeso(goal.targetAmount)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <button
                      onClick={() => handleEdit(goal)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleAchieve(goal.id)}
                      className="text-green-400 hover:text-green-300 text-xs"
                    >
                      달성 ✓
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="text-slate-600 hover:text-red-400 text-xs"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {/* 달성 예측 (기능 #6) */}
                {!est ? (
                  <button
                    onClick={() => loadEstimate(goal.id)}
                    className="mt-3 text-xs text-slate-400 hover:text-orange-400 transition-colors underline"
                  >
                    달성 예측 보기
                  </button>
                ) : (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid #2d3748' }}>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg p-2.5" style={{ backgroundColor: '#0f1729' }}>
                        <p className="text-slate-400 text-xs">현재 저축</p>
                        <p className="text-white font-medium text-sm mt-0.5">
                          {formatMeso(est.currentSavings)}
                        </p>
                      </div>
                      <div className="rounded-lg p-2.5" style={{ backgroundColor: '#0f1729' }}>
                        <p className="text-slate-400 text-xs">남은 금액</p>
                        <p className="text-orange-300 font-medium text-sm mt-0.5">
                          {formatMeso(est.remainingAmount)}
                        </p>
                      </div>
                      <div className="rounded-lg p-2.5" style={{ backgroundColor: '#0f1729' }}>
                        <p className="text-slate-400 text-xs">주간 평균 수익</p>
                        <p className="text-green-400 font-medium text-sm mt-0.5">
                          {formatMeso(est.avgWeeklyIncome)}
                        </p>
                      </div>
                      <div className="rounded-lg p-2.5" style={{ backgroundColor: '#0f1729' }}>
                        <p className="text-slate-400 text-xs">예상 달성</p>
                        <p className="text-blue-400 font-medium text-sm mt-0.5">
                          {est.estimatedWeeks > 0
                            ? `약 ${est.estimatedWeeks}주 후`
                            : '이미 달성 가능!'}
                        </p>
                      </div>
                    </div>
                    {est.estimatedDate && (
                      <p className="text-slate-400 text-xs mt-2 text-center">
                        예상 날짜: {est.estimatedDate}
                      </p>
                    )}
                    {/* 진행 바 */}
                    {est.targetAmount > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>진행률</span>
                          <span>
                            {Math.min(100, Math.round((est.currentSavings / est.targetAmount) * 100))}%
                          </span>
                        </div>
                        <div className="w-full rounded-full h-2" style={{ backgroundColor: '#2d3748' }}>
                          <div
                            className="h-2 rounded-full bg-orange-500 transition-all"
                            style={{
                              width: `${Math.min(100, (est.currentSavings / est.targetAmount) * 100)}%`,
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
          <h2 className="text-slate-500 font-medium text-sm">달성한 목표 ✅</h2>
          {achievedGoals.map((goal) => (
            <div
              key={goal.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl opacity-60"
              style={{ backgroundColor: '#1a1a2e', border: '1px solid #2d3748' }}
            >
              <div>
                <p className="text-slate-300 font-medium text-sm line-through">{goal.itemName}</p>
                <p className="text-slate-500 text-xs">{formatMeso(goal.targetAmount)}</p>
              </div>
              <span className="text-green-400 text-sm">✅ 달성</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
