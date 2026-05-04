import { useState, useEffect, useCallback } from 'react'
import { huntingApi } from '../api/hunting'
import { charactersApi } from '../api/characters'
import { useAuth } from '../contexts/AuthContext'
import type { HuntingSession, MapleCharacter } from '../types'
import { formatMeso, formatDate, toDateString, toKoreanAmount } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import QuickAmountButtons from '../components/ui/QuickAmountButtons'

export default function HuntingPage() {
  const { user, refreshUser } = useAuth()
  const [sessions, setSessions] = useState<HuntingSession[]>([])
  const [characters, setCharacters] = useState<MapleCharacter[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedCharId, setSelectedCharId] = useState('')

  const [form, setForm] = useState({
    income: '',
    solErdaFragments: '',
    sessionDate: toDateString(),
  })

  const fetchSessions = useCallback(async (charId: string) => {
    const params = charId ? { characterId: Number(charId) } : undefined
    const res = await huntingApi.getWeeklySessions(params)
    setSessions(res.data)
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      huntingApi.getWeeklySessions(),
      charactersApi.getCharacters(),
    ]).then(([sess, chars]) => {
      setSessions(sess.data)
      const charList = chars.data
      setCharacters(charList)
      const mainChar = charList.find((c) => c.isMain) ?? charList[0]
      if (mainChar) setSelectedCharId(String(mainChar.id))
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading && selectedCharId) fetchSessions(selectedCharId)
  }, [selectedCharId, fetchSessions, loading])

  const erdaPrice = user?.solErdaFragmentPrice ?? 0

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form.income || !selectedCharId) return
    setSubmitting(true)
    try {
      await huntingApi.recordSession({
        income: Number(form.income),
        solErdaFragments: form.solErdaFragments ? Number(form.solErdaFragments) : undefined,
        sessionDate: form.sessionDate,
        characterId: Number(selectedCharId),
      })
      setForm((p) => ({ ...p, income: '', solErdaFragments: '' }))
      await fetchSessions(selectedCharId)
      await refreshUser()
    } finally {
      setSubmitting(false)
    }
  }

  const totalWeeklyIncome = sessions.reduce((s, sess) => s + sess.totalIncome, 0)

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-orange-400 animate-pulse">불러오는 중...</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>🌲 사냥 기록</h1>
        {characters.length > 0 ? (
          <select
            className="form-field text-sm min-w-[120px] max-w-[200px] w-auto"
            value={selectedCharId}
            onChange={(e) => setSelectedCharId(e.target.value)}
          >
            {characters.map((c) => (
              <option key={c.id} value={String(c.id)} style={{ backgroundColor: 'var(--surface-2)' }}>
                {c.isMain ? `⭐ ${c.name}` : c.name}
              </option>
            ))}
          </select>
        ) : (
          <a href="/characters" className="text-xs underline" style={{ color: 'var(--primary)' }}>캐릭터 등록 →</a>
        )}
      </div>

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

      {/* 사냥 기록 폼 */}
      <Card title="사냥 기록" icon="🌲">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="순수익 (메소)"
                type="number"
                placeholder="예: 500000000"
                value={form.income}
                onChange={(e) => setForm((p) => ({ ...p, income: e.target.value }))}
                min={0}
              />
              <QuickAmountButtons onAdd={(v) => setForm((p) => ({ ...p, income: String((Number(p.income) || 0) + v) }))} />
              {toKoreanAmount(form.income) && (
                <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>{toKoreanAmount(form.income)}</p>
              )}
            </div>
            <div>
              <Input
                label="솔 에르다 조각 개수 (선택)"
                type="number"
                placeholder="획득한 조각 수"
                value={form.solErdaFragments}
                onChange={(e) => setForm((p) => ({ ...p, solErdaFragments: e.target.value }))}
                min={0}
              />
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {[5, 10, 30].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, solErdaFragments: String((Number(p.solErdaFragments) || 0) + n) }))}
                    className="px-2 py-0.5 rounded-lg text-xs font-medium transition-all"
                    style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}
                  >
                    +{n}개
                  </button>
                ))}
              </div>
            </div>
          </div>
          {form.solErdaFragments && Number(form.solErdaFragments) > 0 && erdaPrice > 0 && (
            <p className="text-xs pl-1" style={{ color: 'var(--text-2)' }}>
              🔮 {form.solErdaFragments}개 × {erdaPrice.toLocaleString()}메소 = {formatMeso(Number(form.solErdaFragments) * erdaPrice)} 메소
            </p>
          )}
          <Input
            label="날짜"
            type="date"
            value={form.sessionDate}
            onChange={(e) => setForm((p) => ({ ...p, sessionDate: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={submitting} disabled={!selectedCharId || characters.length === 0}>
              기록하기
            </Button>
          </div>
        </form>
      </Card>

      {/* 이번 주 기록 */}
      <Card title="이번 주 사냥 기록" icon="📋">
        {sessions.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>이번 주 사냥 기록이 없습니다.</p>
        ) : (
          <div className="space-y-1.5">
            {sessions.map((sess: HuntingSession) => (
              <div key={sess.id} className="list-row">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{formatDate(sess.sessionDate)}</p>
                    {sess.solErdaFragments > 0 && (
                      <span className="text-xs" style={{ color: '#a78bfa' }}>🔮 {sess.solErdaFragments}개</span>
                    )}
                  </div>
                  {sess.characterName && (
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{sess.characterName}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm" style={{ color: 'var(--green)' }}>+{formatMeso(sess.totalIncome)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
