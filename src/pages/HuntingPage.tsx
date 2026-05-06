import { useState, useEffect, useCallback } from 'react'
import { huntingApi } from '../api/hunting'
import { charactersApi, bustCharacterCache } from '../api/characters'
import { useAuth } from '../contexts/AuthContext'
import type { HuntingSession, MapleCharacter } from '../types'
import { formatMeso, formatDateTime, toDateString, withCurrentTime, toKoreanAmount } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import QuickAmountButtons from '../components/ui/QuickAmountButtons'

export default function HuntingPage() {
  const { refreshUser, activeServer, activeServerId } = useAuth()
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

  // 편집 모달 상태
  const [editingSession, setEditingSession] = useState<HuntingSession | null>(null)
  const [editForm, setEditForm] = useState({ income: '', solErdaFragments: '', sessionDate: '' })
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [inputMode, setInputMode] = useState<'direct' | 'calc'>('direct')
  const [calcBefore, setCalcBefore] = useState({ meso: '', fragments: '' })
  const [calcAfter, setCalcAfter] = useState({ meso: '', fragments: '' })

  const fetchSessions = useCallback(async (charId: string) => {
    const params = charId ? { characterId: Number(charId) } : undefined
    const res = await huntingApi.getWeeklySessions(params)
    setSessions(res.data)
  }, [])

  useEffect(() => {
    setLoading(true)
    setSelectedCharId('')
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
  }, [activeServerId])

  useEffect(() => {
    if (!loading && selectedCharId) fetchSessions(selectedCharId)
  }, [selectedCharId, fetchSessions, loading])

  const erdaPrice = activeServer?.solErdaFragmentPrice ?? 0
  const selectedChar = characters.find((c) => String(c.id) === selectedCharId)

  const refetchCharacters = useCallback(async () => {
    bustCharacterCache()
    const chars = await charactersApi.getCharacters()
    setCharacters(chars.data)
  }, [])

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!selectedCharId) return
    let income: number
    let fragments: number | undefined
    if (inputMode === 'calc') {
      if (!calcAfter.meso) return
      income = Number(calcAfter.meso) - Number(calcBefore.meso || '0')
      const fragDiff = calcAfter.fragments ? Number(calcAfter.fragments) - Number(calcBefore.fragments || '0') : 0
      fragments = fragDiff > 0 ? fragDiff : undefined
    } else {
      if (!form.income) return
      income = Number(form.income)
      fragments = form.solErdaFragments ? Number(form.solErdaFragments) : undefined
    }
    setSubmitting(true)
    try {
      await huntingApi.recordSession({
        income,
        solErdaFragments: fragments,
        sessionDate: withCurrentTime(form.sessionDate),
        characterId: Number(selectedCharId),
      })
      if (inputMode === 'calc') {
        setCalcBefore({ meso: calcAfter.meso, fragments: calcAfter.fragments })
        setCalcAfter({ meso: '', fragments: '' })
      } else {
        setForm((p) => ({ ...p, income: '', solErdaFragments: '' }))
      }
      await Promise.all([fetchSessions(selectedCharId), refetchCharacters()])
      await refreshUser()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return
    await huntingApi.deleteSession(id)
    await Promise.all([fetchSessions(selectedCharId), refetchCharacters()])
    await refreshUser()
  }

  const openEdit = (sess: HuntingSession) => {
    setEditingSession(sess)
    setEditForm({
      income: String(sess.income),
      solErdaFragments: sess.solErdaFragments > 0 ? String(sess.solErdaFragments) : '',
      sessionDate: sess.sessionDate.slice(0, 10),
    })
  }

  const handleEditSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!editingSession || !editForm.income) return
    setEditSubmitting(true)
    try {
      await huntingApi.updateSession(editingSession.id, {
        income: Number(editForm.income),
        solErdaFragments: editForm.solErdaFragments ? Number(editForm.solErdaFragments) : undefined,
        sessionDate: withCurrentTime(editForm.sessionDate),
      })
      setEditingSession(null)
      await Promise.all([fetchSessions(selectedCharId), refetchCharacters()])
      await refreshUser()
    } finally {
      setEditSubmitting(false)
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
          {/* 입력 모드 토글 */}
          <div className="flex gap-0.5 p-0.5 rounded-xl" style={{ backgroundColor: 'var(--surface-2)', width: 'fit-content' }}>
            {(['direct', 'calc'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  if (mode === 'calc') {
                    setCalcBefore({
                      meso: String(activeServer?.inventoryMeso ?? ''),
                      fragments: String(selectedChar?.solErdaFragments ?? ''),
                    })
                    setCalcAfter({ meso: '', fragments: '' })
                  }
                  setInputMode(mode)
                }}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                style={inputMode === mode
                  ? { backgroundColor: 'var(--primary)', color: '#fff' }
                  : { backgroundColor: 'transparent', color: 'var(--text-3)' }}
              >
                {mode === 'direct' ? '직접 입력' : '인벤 계산'}
              </button>
            ))}
          </div>

          {inputMode === 'direct' ? (
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
                {selectedChar !== undefined && (
                  <p className="text-xs mt-1 pl-0.5" style={{ color: '#a78bfa' }}>
                    🔮 현재 보유: {selectedChar.solErdaFragments.toLocaleString()}개
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>💰 메소</p>
                <Input
                  label="사냥 전 메소"
                  type="number"
                  placeholder="0"
                  value={calcBefore.meso}
                  onChange={(e) => setCalcBefore((p) => ({ ...p, meso: e.target.value }))}
                  min={0}
                />
                <Input
                  label="사냥 후 메소"
                  type="number"
                  placeholder="0"
                  value={calcAfter.meso}
                  onChange={(e) => setCalcAfter((p) => ({ ...p, meso: e.target.value }))}
                  min={0}
                />
                {calcAfter.meso !== '' && (() => {
                  const diff = Number(calcAfter.meso) - Number(calcBefore.meso || '0')
                  return (
                    <p className="text-xs font-semibold pl-0.5" style={{ color: diff >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      순수익 {diff >= 0 ? '+' : ''}{formatMeso(diff)} 메소
                    </p>
                  )
                })()}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>🔮 솔 에르다 조각</p>
                <Input
                  label="사냥 전 조각"
                  type="number"
                  placeholder="0"
                  value={calcBefore.fragments}
                  onChange={(e) => setCalcBefore((p) => ({ ...p, fragments: e.target.value }))}
                  min={0}
                />
                <Input
                  label="사냥 후 조각"
                  type="number"
                  placeholder="0"
                  value={calcAfter.fragments}
                  onChange={(e) => setCalcAfter((p) => ({ ...p, fragments: e.target.value }))}
                  min={0}
                />
                {calcAfter.fragments !== '' && (() => {
                  const diff = Number(calcAfter.fragments) - Number(calcBefore.fragments || '0')
                  return (
                    <p className="text-xs font-semibold pl-0.5" style={{ color: diff >= 0 ? '#a78bfa' : 'var(--red)' }}>
                      획득 조각 {diff >= 0 ? '+' : ''}{diff}개
                    </p>
                  )
                })()}
              </div>
            </div>
          )}

          {inputMode === 'direct' && form.solErdaFragments && Number(form.solErdaFragments) > 0 && erdaPrice > 0 && (
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
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{formatDateTime(sess.sessionDate)}</p>
                    {sess.solErdaFragments > 0 && (
                      <span className="text-xs" style={{ color: '#a78bfa' }}>🔮 {sess.solErdaFragments}개</span>
                    )}
                  </div>
                  {sess.characterName && (
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{sess.characterName}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--green)' }}>+{formatMeso(sess.totalIncome)}</p>
                  <button
                    onClick={() => openEdit(sess)}
                    className="text-xs px-1.5 py-0.5 rounded transition-colors"
                    style={{ color: 'var(--primary)', backgroundColor: 'var(--primary-dim)' }}
                    title="수정"
                  >✏️</button>
                  <button
                    onClick={() => handleDelete(sess.id)}
                    className="text-xs px-1.5 py-0.5 rounded transition-colors"
                    style={{ color: 'var(--text-3)', backgroundColor: 'var(--surface-2)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
                    title="삭제"
                  >🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 편집 모달 */}
      {editingSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditingSession(null) }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm space-y-4"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base" style={{ color: 'var(--text)' }}>✏️ 사냥 기록 수정</h2>
              <button
                onClick={() => setEditingSession(null)}
                className="text-sm w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ color: 'var(--text-3)', backgroundColor: 'var(--surface-2)' }}
              >✕</button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <Input
                  label="순수익 (메소)"
                  type="number"
                  value={editForm.income}
                  onChange={(e) => setEditForm((p) => ({ ...p, income: e.target.value }))}
                  min={0}
                />
                <QuickAmountButtons onAdd={(v) => setEditForm((p) => ({ ...p, income: String((Number(p.income) || 0) + v) }))} />
                {toKoreanAmount(editForm.income) && (
                  <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>{toKoreanAmount(editForm.income)}</p>
                )}
              </div>
              <Input
                label="솔 에르다 조각 개수 (선택)"
                type="number"
                placeholder="0"
                value={editForm.solErdaFragments}
                onChange={(e) => setEditForm((p) => ({ ...p, solErdaFragments: e.target.value }))}
                min={0}
              />
              <Input
                label="날짜"
                type="date"
                value={editForm.sessionDate}
                onChange={(e) => setEditForm((p) => ({ ...p, sessionDate: e.target.value }))}
              />
              <div className="flex gap-2 justify-end pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingSession(null)}>취소</Button>
                <Button type="submit" size="sm" loading={editSubmitting}>저장</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
