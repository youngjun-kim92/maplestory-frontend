import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { huntingApi } from '../api/hunting'
import { charactersApi } from '../api/characters'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api/auth'
import type { HuntingSession, HuntingStats, MapleCharacter } from '../types'
import { formatMeso, formatDate, toDateString } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'

export default function HuntingPage() {
  const { user, refreshUser } = useAuth()
  const [sessions, setSessions] = useState<HuntingSession[]>([])
  const [huntingStats, setHuntingStats] = useState<HuntingStats[]>([])
  const [characters, setCharacters] = useState<MapleCharacter[]>([])
  const [activeTab, setActiveTab] = useState<'record' | 'stats'>('record')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    mapName: '',
    durationMinutes: '',
    income: '',
    solErdaFragments: '',
    sessionDate: toDateString(),
    characterId: '',
  })

  const [erdaPrice, setErdaPrice] = useState('')
  const [savingErdaPrice, setSavingErdaPrice] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [sess, stats, chars] = await Promise.all([
        huntingApi.getWeeklySessions(),
        huntingApi.getHuntingStats(),
        charactersApi.getCharacters(),
      ])
      setSessions(sess.data)
      setHuntingStats(stats.data)
      setCharacters(chars.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    if (user) setErdaPrice(String(user.solErdaFragmentPrice ?? 0))
  }, [fetchData, user])

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form.mapName || !form.durationMinutes || !form.income) return
    setSubmitting(true)
    try {
      await huntingApi.recordSession({
        mapName: form.mapName,
        durationMinutes: Number(form.durationMinutes),
        income: Number(form.income),
        solErdaFragments: form.solErdaFragments ? Number(form.solErdaFragments) : undefined,
        sessionDate: form.sessionDate,
        characterId: form.characterId ? Number(form.characterId) : null,
      })
      setShowForm(false)
      setForm({ mapName: '', durationMinutes: '', income: '', solErdaFragments: '', sessionDate: toDateString(), characterId: '' })
      await fetchData()
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveErdaPrice = async () => {
    setSavingErdaPrice(true)
    try {
      await authApi.updateSolErdaPrice(Number(erdaPrice))
      await refreshUser()
    } finally {
      setSavingErdaPrice(false)
    }
  }

  const totalWeeklyIncome = sessions.reduce((s, sess) => s + sess.totalIncome, 0)

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-orange-400 animate-pulse">불러오는 중...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">🗡️ 사냥터 관리</h1>
        <Button onClick={() => setShowForm((v) => !v)} size="sm">
          {showForm ? '취소' : '+ 사냥 기록'}
        </Button>
      </div>

      {/* 솔 에르다 조각 가격 설정 (기능 #5) */}
      <Card title="솔 에르다 조각 가격 설정" icon="💎">
        <p className="text-slate-400 text-xs mb-3">
          사냥 중 획득한 솔 에르다 조각의 낱개 가격을 설정하면, 기록 시 자동으로 메소 가치로 환산됩니다.
        </p>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="조각 1개 가격 (메소)"
            value={erdaPrice}
            onChange={(e) => setErdaPrice(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSaveErdaPrice} loading={savingErdaPrice} size="md">
            저장
          </Button>
        </div>
        {user && user.solErdaFragmentPrice > 0 && (
          <p className="text-green-400 text-xs mt-2">
            현재 설정 가격: {user.solErdaFragmentPrice.toLocaleString()} 메소/개
          </p>
        )}
      </Card>

      {/* 주간 요약 */}
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>이번 주 사냥 수익</p>
          <p className="font-bold text-2xl mt-0.5" style={{ color: 'var(--orange-light)' }}>{formatMeso(totalWeeklyIncome)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>사냥 횟수</p>
          <p className="font-bold text-2xl mt-0.5" style={{ color: 'var(--text)' }}>{sessions.length}회</p>
        </div>
      </Card>

      {/* 탭 */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
        {[
          { key: 'record', label: '이번 주 기록' },
          { key: 'stats', label: '효율 통계 📈' },
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

      {/* 사냥 기록 폼 */}
      {showForm && (
        <Card title="사냥 세션 기록" icon="🗡️">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="사냥터 이름"
                placeholder="예: 헤이스트 B2"
                value={form.mapName}
                onChange={(e) => setForm((p) => ({ ...p, mapName: e.target.value }))}
              />
              <Input
                label="사냥 시간 (분)"
                type="number"
                placeholder="예: 60"
                value={form.durationMinutes}
                onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))}
                min={1}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="순수익 (메소)"
                type="number"
                placeholder="예: 500000000"
                value={form.income}
                onChange={(e) => setForm((p) => ({ ...p, income: e.target.value }))}
                min={0}
              />
              <Input
                label="솔 에르다 조각 개수 (선택)"
                type="number"
                placeholder="획득한 조각 수"
                value={form.solErdaFragments}
                onChange={(e) => setForm((p) => ({ ...p, solErdaFragments: e.target.value }))}
                min={0}
              />
            </div>
            {form.solErdaFragments && user && user.solErdaFragmentPrice > 0 && (
              <div
                className="text-xs px-3 py-2 rounded-xl"
                style={{ backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: 'var(--orange-light)' }}
              >
                솔 에르다 조각 환산: {(Number(form.solErdaFragments) * user.solErdaFragmentPrice).toLocaleString()} 메소
                → 합산 총수익: {(Number(form.income) + Number(form.solErdaFragments) * user.solErdaFragmentPrice).toLocaleString()} 메소
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="날짜"
                type="date"
                value={form.sessionDate}
                onChange={(e) => setForm((p) => ({ ...p, sessionDate: e.target.value }))}
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
              <Button type="submit" loading={submitting}>기록하기</Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'record' && (
        <Card title="이번 주 사냥 기록" icon="📋">
          {sessions.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>이번 주 사냥 기록이 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {sessions.map((sess: HuntingSession) => (
                <div key={sess.id} className="list-row">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{sess.mapName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                      {sess.durationMinutes}분
                      {sess.solErdaFragments > 0 && (
                        <span style={{ color: '#a78bfa' }} className="ml-1">
                          · 솔에르다 {sess.solErdaFragments}개
                        </span>
                      )}
                      {sess.characterName && ` · ${sess.characterName}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm" style={{ color: 'var(--green)' }}>+{formatMeso(sess.totalIncome)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{formatDate(sess.sessionDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'stats' && (
        <Card title="사냥터별 시간당 수익 효율 (기능 #3)" icon="📊">
          {huntingStats.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>통계를 표시할 데이터가 부족합니다.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={huntingStats.sort((a, b) => b.incomePerHour - a.incomePerHour)}
                  layout="vertical"
                  margin={{ top: 4, right: 40, left: 80, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    type="number"
                    tick={{ fill: '#7b8faa', fontSize: 10 }}
                    tickFormatter={(v) => formatMeso(v)}
                  />
                  <YAxis dataKey="mapName" type="category" tick={{ fill: '#7b8faa', fontSize: 11 }} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 10 }}
                    formatter={(v) => [(v as number).toLocaleString() + ' 메소/시', '시간당 수익']}
                  />
                  <Bar dataKey="incomePerHour" radius={[0, 4, 4, 0]}>
                    {huntingStats.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#f97316' : '#253650'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-3 space-y-1.5">
                {huntingStats
                  .sort((a, b) => b.incomePerHour - a.incomePerHour)
                  .map((stat, i) => (
                    <div key={i} className="list-row">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold w-5" style={{ color: i === 0 ? 'var(--orange-light)' : 'var(--text-2)' }}>
                          #{i + 1}
                        </span>
                        <span className="text-sm" style={{ color: 'var(--text)' }}>{stat.mapName}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm" style={{ color: i === 0 ? 'var(--orange-light)' : 'var(--text)' }}>
                          {formatMeso(stat.incomePerHour)}/시
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{stat.sessionCount}회 · {Math.floor(stat.totalDurationMinutes / 60)}시간</p>
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
