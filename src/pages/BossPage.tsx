import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { bossApi } from '../api/boss'
import { charactersApi } from '../api/characters'
import { useAuth } from '../contexts/AuthContext'
import type { BossKill, BossMaster, BossStats, MapleCharacter, ResetType } from '../types'
import { formatMeso, formatDate, toDateString, difficultyLabel } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import Input from '../components/ui/Input'

const RESET_TYPE_TABS: { key: ResetType | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'daily', label: '일간' },
  { key: 'weekly', label: '주간' },
  { key: 'monthly', label: '월간' },
]

export default function BossPage() {
  const { refreshUser } = useAuth()
  const [bossList, setBossList] = useState<BossMaster[]>([])
  const [weeklyKills, setWeeklyKills] = useState<BossKill[]>([])
  const [bossStats, setBossStats] = useState<BossStats[]>([])
  const [characters, setCharacters] = useState<MapleCharacter[]>([])
  const [activeTab, setActiveTab] = useState<'record' | 'stats'>('record')
  const [resetFilter, setResetFilter] = useState<ResetType | 'all'>('all')
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
    (b) => b.bossName === form.bossName && b.difficulty === form.difficulty
  )

  const filteredBossList = resetFilter === 'all'
    ? bossList
    : bossList.filter((b) => b.resetType === resetFilter)

  const uniqueBossNames = [...new Set(filteredBossList.map((b) => b.bossName))]
  const difficultiesForBoss = filteredBossList
    .filter((b) => b.bossName === form.bossName)
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
    const diffs = filteredBossList.filter((b) => b.bossName === name).map((b) => b.difficulty)
    setForm((p) => ({ ...p, bossName: name, difficulty: diffs[0] || '' }))
  }

  const handleResetFilterChange = (filter: ResetType | 'all') => {
    setResetFilter(filter)
    setForm((p) => ({ ...p, bossName: '', difficulty: '' }))
  }

  const [charError, setCharError] = useState('')

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form.bossName || !form.difficulty) return
    if (!form.characterId) { setCharError('캐릭터를 선택해주세요.'); return }
    setCharError('')
    setSubmitting(true)
    try {
      await bossApi.recordBossKill({
        bossName: form.bossName,
        difficulty: form.difficulty,
        killDate: form.killDate,
        characterId: Number(form.characterId),
      })
      setShowForm(false)
      setForm((p) => ({ ...p, bossName: '', difficulty: '' }))
      await fetchData()
      await refreshUser()
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
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>⚔️ 보스 관리</h1>
        <Button onClick={() => setShowForm((v) => !v)} size="sm">
          {showForm ? '취소' : '+ 보스 처치 기록'}
        </Button>
      </div>

      {/* 주간 수익 요약 */}
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>이번 주 보스 수익</p>
          <p className="font-bold text-2xl mt-0.5" style={{ color: 'var(--orange-light)' }}>{formatMeso(totalWeeklyRevenue)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>처치 횟수</p>
          <p className="font-bold text-2xl mt-0.5" style={{ color: 'var(--text)' }}>{weeklyKills.length}회</p>
        </div>
      </Card>

      {/* 탭 */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
        {[
          { key: 'record', label: '이번 주 기록' },
          { key: 'stats', label: '수익 효율 통계 📈' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'record' | 'stats')}
            className={`tab-btn ${activeTab === tab.key ? 'tab-btn-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 보스 처치 기록 폼 */}
      {showForm && (
        <Card title="보스 처치 기록" icon="⚔️">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* resetType 필터 탭 */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-2)' }}>
                보스 유형
              </p>
              <div className="flex gap-1.5">
                {RESET_TYPE_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleResetFilterChange(tab.key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={
                      resetFilter === tab.key
                        ? { backgroundColor: 'rgba(249,115,22,0.18)', color: 'var(--orange-light)', border: '1px solid rgba(249,115,22,0.4)' }
                        : { backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border-2)' }
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
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
                    ? difficultiesForBoss.map((d) => ({ value: d, label: difficultyLabel(d) }))
                    : [{ value: '', label: '보스를 먼저 선택하세요' }]
                }
                value={form.difficulty}
                onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                disabled={!form.bossName}
              />
            </div>
            {selectedBoss && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ backgroundColor: 'var(--bg)', border: '1px solid rgba(249,115,22,0.4)' }}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--orange-light)' }}>결정석 가격:</span>
                <span className="font-bold" style={{ color: 'var(--text)' }}>{selectedBoss.crystalPrice.toLocaleString()} 메소</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="처치 날짜"
                type="date"
                value={form.killDate}
                onChange={(e) => setForm((p) => ({ ...p, killDate: e.target.value }))}
              />
              {characters.length > 0 ? (
                <Select
                  label="캐릭터 *"
                  options={[
                    { value: '', label: '캐릭터를 선택하세요 *' },
                    ...characters.map((c) => ({ value: String(c.id), label: c.isMain ? `⭐ ${c.name}` : c.name })),
                  ]}
                  value={form.characterId}
                  onChange={(e) => { setForm((p) => ({ ...p, characterId: e.target.value })); setCharError('') }}
                  error={charError}
                />
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--text-2)' }}>캐릭터 *</label>
                  <div className="form-field flex items-center justify-between" style={{ color: 'var(--text-3)' }}>
                    <span className="text-xs">등록된 캐릭터가 없습니다</span>
                    <a href="/characters" className="text-xs underline" style={{ color: 'var(--primary)' }}>캐릭터 등록 →</a>
                  </div>
                </div>
              )}
            </div>
            {charError && <p className="text-xs" style={{ color: 'var(--red)' }}>{charError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>취소</Button>
              <Button type="submit" loading={submitting} disabled={!form.bossName || !form.difficulty || characters.length === 0}>
                기록하기
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'record' && (
        <Card title="이번 주 보스 처치 목록" icon="📋">
          {weeklyKills.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>이번 주 처치 기록이 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {weeklyKills.map((kill) => (
                <div key={kill.id} className="list-row">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {kill.bossName}
                      <span className="text-xs ml-2" style={{ color: 'var(--text-2)' }}>({difficultyLabel(kill.difficulty)})</span>
                    </p>
                    {kill.characterName && (
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{kill.characterName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm" style={{ color: 'var(--orange-light)' }}>
                      +{formatMeso(kill.crystalPrice)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{formatDate(kill.killDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'stats' && (
        <Card title="보스별 누적 수익 통계" icon="📊">
          {bossStats.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>
              통계를 표시할 데이터가 부족합니다.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={bossStats} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="bossName"
                    tick={{ fill: '#7b8faa', fontSize: 11 }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: '#7b8faa', fontSize: 11 }}
                    tickFormatter={(v) => formatMeso(v)}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 10 }}
                    labelStyle={{ color: 'var(--text)' }}
                    formatter={(v) => [(v as number).toLocaleString() + ' 메소', '총수익']}
                  />
                  <Bar dataKey="totalRevenue" radius={[4, 4, 0, 0]}>
                    {bossStats.map((_, i) => (
                      <Cell key={i} fill={i % 2 === 0 ? '#f97316' : '#fb923c'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-3 space-y-1.5">
                {bossStats
                  .sort((a, b) => b.totalRevenue - a.totalRevenue)
                  .slice(0, 5)
                  .map((stat, i) => (
                    <div key={i} className="list-row">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm w-5" style={{ color: 'var(--orange-light)' }}>#{i + 1}</span>
                        <span className="text-sm" style={{ color: 'var(--text)' }}>{stat.bossName}</span>
                        <span className="text-xs" style={{ color: 'var(--text-2)' }}>({difficultyLabel(stat.difficulty)})</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm" style={{ color: 'var(--orange-light)' }}>{formatMeso(stat.totalRevenue)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{stat.killCount}회 처치</p>
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
