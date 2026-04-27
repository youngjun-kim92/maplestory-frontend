import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { bossApi } from '../api/boss'
import { charactersApi } from '../api/characters'
import type { BossKill, BossMaster, BossStats, MapleCharacter } from '../types'
import { formatMeso, formatDate, toDateString } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import Input from '../components/ui/Input'

export default function BossPage() {
  const [bossList, setBossList] = useState<BossMaster[]>([])
  const [weeklyKills, setWeeklyKills] = useState<BossKill[]>([])
  const [bossStats, setBossStats] = useState<BossStats[]>([])
  const [characters, setCharacters] = useState<MapleCharacter[]>([])
  const [activeTab, setActiveTab] = useState<'record' | 'stats'>('record')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    bossName: '',
    difficulty: '',
    killDate: toDateString(),
    characterId: '',
  })

  const selectedBoss = bossList.find(
    (b) => b.name === form.bossName && b.difficulty === form.difficulty
  )

  const uniqueBossNames = [...new Set(bossList.map((b) => b.name))]
  const difficultiesForBoss = bossList
    .filter((b) => b.name === form.bossName)
    .map((b) => b.difficulty)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [list, kills, stats, chars] = await Promise.all([
        bossApi.getBossList(),
        bossApi.getWeeklyBossKills(),
        bossApi.getBossStats(),
        charactersApi.getCharacters(),
      ])
      setBossList(list.data)
      setWeeklyKills(kills.data)
      setBossStats(stats.data)
      setCharacters(chars.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleBossNameChange = (name: string) => {
    const diffs = bossList.filter((b) => b.name === name).map((b) => b.difficulty)
    setForm((p) => ({ ...p, bossName: name, difficulty: diffs[0] || '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.bossName || !form.difficulty) return
    setSubmitting(true)
    try {
      await bossApi.recordBossKill({
        bossName: form.bossName,
        difficulty: form.difficulty,
        killDate: form.killDate,
        characterId: form.characterId ? Number(form.characterId) : null,
      })
      setShowForm(false)
      setForm((p) => ({ ...p, bossName: '', difficulty: '' }))
      await fetchData()
    } finally {
      setSubmitting(false)
    }
  }

  const totalWeeklyRevenue = weeklyKills.reduce((s, k) => s + k.crystalPrice, 0)

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-orange-400 animate-pulse">불러오는 중...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">⚔️ 보스 관리</h1>
        <Button onClick={() => setShowForm((v) => !v)} size="sm">
          {showForm ? '취소' : '+ 보스 처치 기록'}
        </Button>
      </div>

      {/* 주간 수익 요약 */}
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">이번 주 보스 수익</p>
          <p className="text-orange-400 font-bold text-2xl mt-0.5">{formatMeso(totalWeeklyRevenue)}</p>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-sm">처치 횟수</p>
          <p className="text-white font-bold text-2xl mt-0.5">{weeklyKills.length}회</p>
        </div>
      </Card>

      {/* 탭 */}
      <div className="flex gap-2 border-b" style={{ borderColor: '#2d3748' }}>
        {[
          { key: 'record', label: '이번 주 기록' },
          { key: 'stats', label: '수익 효율 통계 📈' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'record' | 'stats')}
            className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.key
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 보스 처치 기록 폼 */}
      {showForm && (
        <Card title="보스 처치 기록" icon="⚔️">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="보스 선택"
                options={[
                  { value: '', label: '보스를 선택하세요' },
                  ...uniqueBossNames.map((n) => ({ value: n, label: n })),
                ]}
                value={form.bossName}
                onChange={(e) => handleBossNameChange(e.target.value)}
              />
              <Select
                label="난이도"
                options={
                  difficultiesForBoss.length > 0
                    ? difficultiesForBoss.map((d) => ({ value: d, label: d }))
                    : [{ value: '', label: '보스를 먼저 선택하세요' }]
                }
                value={form.difficulty}
                onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                disabled={!form.bossName}
              />
            </div>
            {selectedBoss && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: '#0f1729', border: '1px solid #f97316' }}
              >
                <span className="text-orange-400 text-sm font-medium">결정석 가격:</span>
                <span className="text-white font-bold">{selectedBoss.crystalPrice.toLocaleString()} 메소</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="처치 날짜"
                type="date"
                value={form.killDate}
                onChange={(e) => setForm((p) => ({ ...p, killDate: e.target.value }))}
              />
              {characters.length > 0 && (
                <Select
                  label="캐릭터 (선택)"
                  options={[
                    { value: '', label: '선택 안함' },
                    ...characters.map((c) => ({ value: String(c.id), label: c.name })),
                  ]}
                  value={form.characterId}
                  onChange={(e) => setForm((p) => ({ ...p, characterId: e.target.value }))}
                />
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>취소</Button>
              <Button type="submit" loading={submitting} disabled={!form.bossName || !form.difficulty}>
                기록하기
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'record' && (
        <Card title="이번 주 보스 처치 목록" icon="📋">
          {weeklyKills.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">이번 주 처치 기록이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {weeklyKills.map((kill) => (
                <div
                  key={kill.id}
                  className="flex items-center justify-between py-3 px-3 rounded-lg"
                  style={{ backgroundColor: '#0f1729' }}
                >
                  <div>
                    <p className="text-white text-sm font-medium">
                      {kill.bossName}
                      <span className="text-slate-400 text-xs ml-2">({kill.difficulty})</span>
                    </p>
                    {kill.characterName && (
                      <p className="text-slate-500 text-xs">{kill.characterName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-orange-400 font-semibold text-sm">
                      +{formatMeso(kill.crystalPrice)}
                    </p>
                    <p className="text-slate-500 text-xs">{formatDate(kill.killDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'stats' && (
        <Card title="보스별 누적 수익 통계 (기능 #3)" icon="📊">
          {bossStats.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">
              통계를 표시할 데이터가 부족합니다.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={bossStats} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis
                    dataKey="bossName"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(v) => formatMeso(v)}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #4a5568', borderRadius: 8 }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(v) => [(v as number).toLocaleString() + ' 메소', '총수익']}
                  />
                  <Bar dataKey="totalRevenue" radius={[4, 4, 0, 0]}>
                    {bossStats.map((_, i) => (
                      <Cell key={i} fill={i % 2 === 0 ? '#f97316' : '#fb923c'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-3 space-y-2">
                {bossStats
                  .sort((a, b) => b.totalRevenue - a.totalRevenue)
                  .slice(0, 5)
                  .map((stat, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 px-3 rounded-lg"
                      style={{ backgroundColor: '#0f1729' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-orange-400 font-bold text-sm w-5">#{i + 1}</span>
                        <span className="text-white text-sm">{stat.bossName}</span>
                        <span className="text-slate-400 text-xs">({stat.difficulty})</span>
                      </div>
                      <div className="text-right">
                        <p className="text-orange-400 font-semibold text-sm">{formatMeso(stat.totalRevenue)}</p>
                        <p className="text-slate-500 text-xs">{stat.killCount}회 처치</p>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  )
}
