import { useState, useEffect } from 'react'
import { RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { statsApi } from '../api/stats'
import type { ExpCalculatorResponse, StatsComparison } from '../types'
import { formatMeso } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function StatsPage() {
  const [comparison, setComparison] = useState<StatsComparison | null>(null)
  const [compLoading, setCompLoading] = useState(true)

  const [expForm, setExpForm] = useState({
    currentLevel: '',
    currentExpPercent: '',
    avgExpPerHour: '',
    targetLevel: '',
  })
  const [expResult, setExpResult] = useState<ExpCalculatorResponse | null>(null)
  const [expLoading, setExpLoading] = useState(false)

  useEffect(() => {
    statsApi.getUserComparison()
      .then((r) => setComparison(r.data))
      .catch(() => setComparison(null))
      .finally(() => setCompLoading(false))
  }, [])

  const handleExpCalc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expForm.currentLevel || !expForm.currentExpPercent || !expForm.avgExpPerHour) return
    setExpLoading(true)
    try {
      const res = await statsApi.calculateExp({
        currentLevel: Number(expForm.currentLevel),
        currentExpPercent: Number(expForm.currentExpPercent),
        avgExpPerHour: Number(expForm.avgExpPerHour),
        targetLevel: expForm.targetLevel ? Number(expForm.targetLevel) : undefined,
      })
      setExpResult(res.data)
    } finally {
      setExpLoading(false)
    }
  }

  const percentileColor = comparison
    ? comparison.percentile >= 80
      ? '#f97316'
      : comparison.percentile >= 50
      ? '#22c55e'
      : '#94a3b8'
    : '#94a3b8'

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">📊 통계</h1>

      {/* 기능 #9: 익명 유저 수익 비교 */}
      <Card title="익명 수익 비교" icon="👥">
        {compLoading ? (
          <div className="text-center py-6 text-orange-400 animate-pulse text-sm">불러오는 중...</div>
        ) : !comparison ? (
          <p className="text-slate-500 text-sm text-center py-6">
            수익 비교 데이터가 부족합니다.<br />
            더 많은 가계부를 기록하면 확인할 수 있어요.
          </p>
        ) : (
          <div className="space-y-4">
            {/* 백분위 원형 차트 */}
            <div className="flex items-center gap-4">
              <div style={{ width: 120, height: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: comparison.percentile },
                        { value: 100 - comparison.percentile },
                      ]}
                      startAngle={90}
                      endAngle={-270}
                      innerRadius={38}
                      outerRadius={52}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      <Cell fill={percentileColor} />
                      <Cell fill="#2d3748" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-2xl" style={{ color: percentileColor }}>
                  상위 {100 - comparison.percentile}%
                </p>
                <p className="text-slate-300 text-sm mt-1">{comparison.message}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3" style={{ backgroundColor: '#0f1729' }}>
                <p className="text-slate-400 text-xs mb-1">나의 주간 평균 수익</p>
                <p className="text-orange-400 font-bold text-base">{formatMeso(comparison.myWeeklyAvg)}</p>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: '#0f1729' }}>
                <p className="text-slate-400 text-xs mb-1">전체 유저 평균</p>
                <p className="text-slate-300 font-bold text-base">{formatMeso(comparison.allUsersWeeklyAvg)}</p>
              </div>
            </div>

            {/* 비교 바 */}
            <div>
              <p className="text-slate-400 text-xs mb-2">평균 대비 비율</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-orange-400 text-xs w-8">나</span>
                  <div className="flex-1 rounded-full h-3 overflow-hidden" style={{ backgroundColor: '#2d3748' }}>
                    <div
                      className="h-3 rounded-full"
                      style={{
                        width: `${Math.min(100, (comparison.myWeeklyAvg / Math.max(comparison.myWeeklyAvg, comparison.allUsersWeeklyAvg)) * 100)}%`,
                        backgroundColor: '#f97316',
                      }}
                    />
                  </div>
                  <span className="text-orange-400 text-xs w-16 text-right">{formatMeso(comparison.myWeeklyAvg)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs w-8">평균</span>
                  <div className="flex-1 rounded-full h-3 overflow-hidden" style={{ backgroundColor: '#2d3748' }}>
                    <div
                      className="h-3 rounded-full"
                      style={{
                        width: `${Math.min(100, (comparison.allUsersWeeklyAvg / Math.max(comparison.myWeeklyAvg, comparison.allUsersWeeklyAvg)) * 100)}%`,
                        backgroundColor: '#64748b',
                      }}
                    />
                  </div>
                  <span className="text-slate-400 text-xs w-16 text-right">{formatMeso(comparison.allUsersWeeklyAvg)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 기능 #7: 경험치 계산기 */}
      <Card title="레벨업 경험치 계산기" icon="⬆️">
        <p className="text-slate-400 text-xs mb-4">
          현재 레벨과 시간당 경험치를 입력하면, 레벨업까지 필요한 시간을 계산해드립니다.
        </p>
        <form onSubmit={handleExpCalc} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="현재 레벨"
              type="number"
              placeholder="예: 260"
              value={expForm.currentLevel}
              onChange={(e) => setExpForm((p) => ({ ...p, currentLevel: e.target.value }))}
              min={1}
              max={300}
            />
            <Input
              label="현재 경험치 (%)"
              type="number"
              placeholder="예: 45.5"
              value={expForm.currentExpPercent}
              onChange={(e) => setExpForm((p) => ({ ...p, currentExpPercent: e.target.value }))}
              min={0}
              max={99}
              step={0.01}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="시간당 평균 획득 경험치"
              type="number"
              placeholder="예: 2000000000"
              value={expForm.avgExpPerHour}
              onChange={(e) => setExpForm((p) => ({ ...p, avgExpPerHour: e.target.value }))}
              min={1}
            />
            <Input
              label="목표 레벨 (선택)"
              type="number"
              placeholder="비우면 다음 레벨"
              value={expForm.targetLevel}
              onChange={(e) => setExpForm((p) => ({ ...p, targetLevel: e.target.value }))}
              min={1}
              max={300}
            />
          </div>
          <Button type="submit" loading={expLoading} className="w-full">
            계산하기
          </Button>
        </form>

        {expResult && (
          <div
            className="mt-4 p-4 rounded-xl space-y-3"
            style={{ backgroundColor: '#0f1729', border: '1px solid #2d3748' }}
          >
            <h3 className="text-white font-semibold text-sm">
              Lv.{expResult.currentLevel} → Lv.{expResult.targetLevel} 계산 결과
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-slate-400 text-xs mb-1">필요 경험치</p>
                <p className="text-orange-400 font-bold text-sm">{expResult.requiredExp.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-xs mb-1">예상 소요 시간</p>
                <p className="text-orange-400 font-bold text-sm">
                  {expResult.estimatedHours > 0 && `${expResult.estimatedHours}시간 `}
                  {expResult.estimatedMinutes}분
                </p>
              </div>
            </div>
            {expResult.estimatedHours > 0 && (
              <div className="text-center">
                <p className="text-slate-500 text-xs">
                  하루 4시간 기준 약 {Math.ceil(expResult.estimatedHours / 4)}일 소요
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 기능 #9 관련 안내 */}
      <Card title="데이터 활용 안내" icon="ℹ️">
        <div className="space-y-2 text-slate-400 text-xs">
          <p>• 수익 비교는 서비스에 등록된 모든 유저의 <span className="text-white">익명화된</span> 데이터를 기반으로 합니다.</p>
          <p>• 개인 정보는 공유되지 않으며, 통계 평균값만 활용됩니다.</p>
          <p>• 더 많은 가계부를 기록할수록 정확한 비교가 가능합니다.</p>
        </div>
      </Card>
    </div>
  )
}
