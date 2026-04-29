import { useState } from 'react'
import { statsApi } from '../api/stats'
import type { ExpCalculatorResponse } from '../types'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function ExpPage() {
  const [form, setForm] = useState({
    currentLevel: '', currentExpPercent: '', avgExpPerHour: '', targetLevel: '',
  })
  const [result, setResult] = useState<ExpCalculatorResponse | null>(null)
  const [calculating, setCalculating] = useState(false)

  const handleCalculate = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form.currentLevel || !form.currentExpPercent || !form.avgExpPerHour) return
    setCalculating(true)
    try {
      const res = await statsApi.calculateExp({
        currentLevel: Number(form.currentLevel),
        currentExpPercent: Number(form.currentExpPercent),
        avgExpPerHour: Number(form.avgExpPerHour),
        targetLevel: form.targetLevel ? Number(form.targetLevel) : undefined,
      })
      setResult(res.data)
    } finally {
      setCalculating(false)
    }
  }

  const reset = () => {
    setForm({ currentLevel: '', currentExpPercent: '', avgExpPerHour: '', targetLevel: '' })
    setResult(null)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold font-heading" style={{ color: 'var(--text)' }}>
        📈 경험치 계산기
      </h1>

      <Card icon="🧮" title="사냥 시간 예측">
        <form onSubmit={handleCalculate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="현재 레벨"
              type="number"
              placeholder="예: 260"
              value={form.currentLevel}
              onChange={(e) => setForm((p) => ({ ...p, currentLevel: e.target.value }))}
              min={1} max={300}
            />
            <Input
              label="현재 경험치 %"
              type="number"
              placeholder="예: 45.5"
              value={form.currentExpPercent}
              onChange={(e) => setForm((p) => ({ ...p, currentExpPercent: e.target.value }))}
              min={0} max={100} step={0.1}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="시간당 경험치 %"
              type="number"
              placeholder="예: 12.3"
              value={form.avgExpPerHour}
              onChange={(e) => setForm((p) => ({ ...p, avgExpPerHour: e.target.value }))}
              min={0.01} step={0.01}
            />
            <Input
              label="목표 레벨 (선택)"
              type="number"
              placeholder="예: 275"
              value={form.targetLevel}
              onChange={(e) => setForm((p) => ({ ...p, targetLevel: e.target.value }))}
              min={1} max={300}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={calculating} className="flex-1">
              계산하기
            </Button>
            {result && (
              <Button type="button" variant="ghost" onClick={reset}>
                초기화
              </Button>
            )}
          </div>
        </form>
      </Card>

      {result && (
        <Card>
          <div
            className="rounded-2xl p-5 text-center"
            style={{ backgroundColor: 'var(--primary-dim)', border: '1px solid var(--primary-glow)' }}
          >
            <p className="text-sm mb-1" style={{ color: 'var(--text-2)' }}>
              Lv.{result.currentLevel} → Lv.{result.targetLevel}
            </p>
            <p className="font-bold text-3xl font-heading" style={{ color: 'var(--primary)' }}>
              {result.estimatedHours}시간 {result.estimatedMinutes}분
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
              ≈ {(result.estimatedHours / 24).toFixed(1)}일
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="info-box text-center">
              <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>현재 레벨</p>
              <p className="font-bold" style={{ color: 'var(--text)' }}>Lv.{result.currentLevel}</p>
            </div>
            <div className="info-box text-center">
              <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>목표 레벨</p>
              <p className="font-bold" style={{ color: 'var(--primary)' }}>Lv.{result.targetLevel}</p>
            </div>
          </div>
        </Card>
      )}

      <div
        className="rounded-2xl p-4 text-xs space-y-1.5"
        style={{ backgroundColor: 'var(--surface-2)', border: '1px dashed var(--border-2)', color: 'var(--text-3)' }}
      >
        <p>💡 <strong style={{ color: 'var(--text-2)' }}>시간당 경험치 % 측정 방법</strong></p>
        <p>캐릭터 창(C) → 경험치 게이지를 1분간 사냥 후 측정 → ×60</p>
        <p>또는 사냥 전후 경험치 차이를 분단위로 나눈 후 ×60</p>
      </div>
    </div>
  )
}
