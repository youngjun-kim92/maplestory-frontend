import { useState, useEffect, useCallback } from 'react'
import { charactersApi } from '../api/characters'
import { useAuth } from '../contexts/AuthContext'
import type { CharacterROI, MapleCharacter } from '../types'
import { formatMeso } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'


const JOB_GROUPS = [
  { group: '모험가 - 전사', jobs: ['히어로', '팔라딘', '다크나이트'] },
  { group: '모험가 - 마법사', jobs: ['아크메이지(불,독)', '아크메이지(썬,콜)', '비숍'] },
  { group: '모험가 - 궁수', jobs: ['보우마스터', '신궁', '패스파인더'] },
  { group: '모험가 - 도적', jobs: ['나이트로드', '섀도어', '듀얼블레이드'] },
  { group: '모험가 - 해적', jobs: ['바이퍼', '캡틴', '캐논슈터'] },
  { group: '시그너스 기사단 - 전사', jobs: ['미하일', '소울마스터'] },
  { group: '시그너스 기사단 - 마법사', jobs: ['플레임위자드'] },
  { group: '시그너스 기사단 - 궁수', jobs: ['윈드브레이커'] },
  { group: '시그너스 기사단 - 도적', jobs: ['나이트워커'] },
  { group: '시그너스 기사단 - 해적', jobs: ['스트라이커'] },
  { group: '레지스탕스 - 전사', jobs: ['데몬슬레이어', '데몬어벤져', '블래스터'] },
  { group: '레지스탕스 - 마법사', jobs: ['배틀메이지'] },
  { group: '레지스탕스 - 궁수', jobs: ['와일드헌터'] },
  { group: '레지스탕스 - 해적', jobs: ['제논', '메카닉'] },
  { group: '영웅', jobs: ['아란', '에반', '루미너스', '메르세데스', '팬텀', '은월'] },
  { group: '노바', jobs: ['카이저', '카인', '카데나', '엔젤릭버스터'] },
  { group: '레프', jobs: ['아델', '일리움', '칼리', '아크'] },
  { group: '아니마', jobs: ['렌', '라라', '호영'] },
  { group: '기타/초월자', jobs: ['제로', '키네시스'] },
]

export default function CharactersPage() {
  const { refreshUser } = useAuth()
  const [characters, setCharacters] = useState<MapleCharacter[]>([])
  const [rois, setRois] = useState<Record<number, CharacterROI>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const totalFragments = characters.reduce((s, c) => s + (c.solErdaFragments ?? 0), 0)

  const [form, setForm] = useState({
    name: '', jobClass: '', level: '', isMain: false, initialInvestment: '', solErdaFragments: '',
  })

  // 일괄 등록 상태
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkRows, setBulkRows] = useState<{ name: string; jobClass: string; level: string; isMain: boolean }[]>(
    [{ name: '', jobClass: '', level: '', isMain: false }]
  )
  const [bulkSubmitting, setBulkSubmitting] = useState(false)

  const addBulkRow = () =>
    setBulkRows((p) => [...p, { name: '', jobClass: '', level: '', isMain: false }])

  const removeBulkRow = (i: number) =>
    setBulkRows((p) => p.filter((_, idx) => idx !== i))

  const updateBulkRow = (i: number, field: string, value: string | boolean) =>
    setBulkRows((p) => p.map((r, idx) => idx === i ? { ...r, [field]: value } : r))

  const handleBulkSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    const valid = bulkRows.filter((r) => r.name.trim())
    if (valid.length === 0) return
    setBulkSubmitting(true)
    try {
      await charactersApi.bulkCreateCharacters(
        valid.map((r) => ({
          name: r.name.trim(),
          jobClass: r.jobClass || undefined,
          level: r.level ? Number(r.level) : undefined,
          isMain: r.isMain,
        }))
      )
      setShowBulkModal(false)
      setBulkRows([{ name: '', jobClass: '', level: '', isMain: false }])
      await Promise.all([fetchCharacters(), refreshUser()])
    } finally {
      setBulkSubmitting(false)
    }
  }

  const fetchCharacters = useCallback(async () => {
    setLoading(true)
    try {
      const charsRes = await charactersApi.getCharacters()
      setCharacters(charsRes.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCharacters() }, [fetchCharacters])

  const loadROI = async (charId: number) => {
    if (rois[charId]) return
    try {
      const res = await charactersApi.getCharacterROI(charId)
      setRois((p) => ({ ...p, [charId]: res.data }))
    } catch { /* 데이터 부족 */ }
  }

  useEffect(() => {
    characters.forEach((c) => {
      if (c.initialInvestment > 0) loadROI(c.id)
    })
  }, [characters]) // eslint-disable-line

  const resetForm = () => {
    setForm({ name: '', jobClass: '', level: '', isMain: false, initialInvestment: '', solErdaFragments: '' })
    setShowForm(false)
    setEditingId(null)
  }

  const openAddForm = () => {
    setForm({ name: '', jobClass: '', level: '', isMain: characters.length === 0, initialInvestment: '', solErdaFragments: '' })
    setEditingId(null)
    setShowForm(true)
  }

  const handleEdit = (char: MapleCharacter) => {
    setForm({
      name: char.name,
      jobClass: char.jobClass || '',
      level: char.level ? String(char.level) : '',
      isMain: char.isMain,
      initialInvestment: char.initialInvestment ? String(char.initialInvestment) : '',
      solErdaFragments: char.solErdaFragments ? String(char.solErdaFragments) : '',
    })
    setEditingId(char.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form.name) return

    if (form.isMain) {
      const existingMain = characters.find((c) => c.isMain && c.id !== editingId)
      if (existingMain) {
        const ok = window.confirm(
          `'${existingMain.name}'이(가) 현재 메인 캐릭터입니다.\n'${form.name}'으로 메인 캐릭터를 변경하시겠습니까?`
        )
        if (!ok) return
      }
    }

    setSubmitting(true)
    try {
      const payload = {
        name: form.name,
        jobClass: form.jobClass || undefined,
        level: form.level ? Number(form.level) : undefined,
        isMain: form.isMain,
        initialInvestment: form.initialInvestment ? Number(form.initialInvestment) : undefined,
        solErdaFragments: form.solErdaFragments ? Number(form.solErdaFragments) : undefined,
      }
      if (editingId) {
        await charactersApi.updateCharacter(editingId, payload)
      } else {
        await charactersApi.createCharacter(payload)
      }
      resetForm()
      await Promise.all([fetchCharacters(), refreshUser()])
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId === null) return
    const id = deleteConfirmId
    setDeleteConfirmId(null)
    await charactersApi.deleteCharacter(id)
    setRois((p) => { const n = { ...p }; delete n[id]; return n })
    await Promise.all([fetchCharacters(), refreshUser()])
  }

  const mainChars = characters.filter((c) => c.isMain)
  const subChars  = characters.filter((c) => !c.isMain)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 animate-pulse" style={{ color: 'var(--text-3)' }}>
        불러오는 중...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-heading" style={{ color: 'var(--text)' }}>🧙 캐릭터 관리</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
            style={{
              color: 'var(--text-2)',
              backgroundColor: 'var(--surface-2)',
              border: '1.5px solid var(--border)',
            }}
          >
            일괄 등록
          </button>
          <Button size="sm" onClick={showForm ? resetForm : openAddForm}>
            {showForm ? '취소' : '+ 캐릭터 추가'}
          </Button>
        </div>
      </div>

      {/* 일괄 등록 모달 */}
      {showBulkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowBulkModal(false) }}
        >
          <div
            className="rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
          >
            <div className="flex items-center justify-between p-5 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-bold text-base" style={{ color: 'var(--text)' }}>📋 캐릭터 일괄 등록</h2>
              <button
                onClick={() => setShowBulkModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-sm"
                style={{ color: 'var(--text-3)', backgroundColor: 'var(--surface-2)' }}
              >✕</button>
            </div>

            <form onSubmit={handleBulkSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1 p-4 space-y-2">
                {/* 테이블 헤더 */}
                <div className="grid gap-2 px-1 mb-1" style={{ gridTemplateColumns: '1fr 1.2fr 70px 50px 32px' }}>
                  {['캐릭터명 *', '직업', '레벨', '메인', ''].map((h) => (
                    <span key={h} className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                      {h}
                    </span>
                  ))}
                </div>

                {bulkRows.map((row, i) => (
                  <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 1.2fr 70px 50px 32px' }}>
                    <input
                      className="form-field text-sm"
                      placeholder="닉네임"
                      value={row.name}
                      onChange={(e) => updateBulkRow(i, 'name', e.target.value)}
                    />
                    <select
                      className="form-field text-sm"
                      value={row.jobClass}
                      onChange={(e) => updateBulkRow(i, 'jobClass', e.target.value)}
                    >
                      <option value="">직업 선택</option>
                      {JOB_GROUPS.map((g) => (
                        <optgroup key={g.group} label={g.group}>
                          {g.jobs.map((j) => (
                            <option key={j} value={j}>{j}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <input
                      className="form-field text-sm"
                      type="number"
                      placeholder="레벨"
                      min={1}
                      max={300}
                      value={row.level}
                      onChange={(e) => updateBulkRow(i, 'level', e.target.value)}
                    />
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={row.isMain}
                        onChange={(e) => updateBulkRow(i, 'isMain', e.target.checked)}
                        className="w-4 h-4 cursor-pointer"
                        style={{ accentColor: 'var(--primary)' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBulkRow(i)}
                      disabled={bulkRows.length === 1}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-all"
                      style={{
                        color: bulkRows.length === 1 ? 'var(--text-3)' : 'var(--red)',
                        backgroundColor: 'var(--surface-2)',
                        opacity: bulkRows.length === 1 ? 0.4 : 1,
                      }}
                    >✕</button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addBulkRow}
                  className="w-full py-2 rounded-xl text-sm font-medium transition-all mt-1"
                  style={{
                    color: 'var(--primary)',
                    border: '1.5px dashed var(--primary-glow)',
                    backgroundColor: 'var(--primary-dim)',
                  }}
                >
                  + 행 추가
                </button>
              </div>

              <div className="flex items-center justify-between p-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {bulkRows.filter((r) => r.name.trim()).length}명 등록 예정
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowBulkModal(false)}>취소</Button>
                  <Button
                    type="submit"
                    size="sm"
                    loading={bulkSubmitting}
                    disabled={bulkRows.every((r) => !r.name.trim())}
                  >
                    일괄 등록
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <Card title={editingId ? '캐릭터 수정' : '캐릭터 추가'} icon="🧙">
          {!editingId && characters.length === 0 && (
            <div
              className="mb-3 p-3 rounded-xl text-sm"
              style={{ backgroundColor: 'var(--primary-dim)', border: '1px solid var(--primary-glow)', color: 'var(--primary)' }}
            >
              처음 오셨군요! 먼저 메인 캐릭터를 등록해주세요. '메인 캐릭터'로 설정하면 보스 처치 기록 시 자동으로 선택됩니다.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="캐릭터 이름 *"
                placeholder="닉네임"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                autoFocus
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--text-2)' }}>
                  직업 (선택)
                </label>
                <select
                  className="form-field"
                  value={form.jobClass}
                  onChange={(e) => setForm((p) => ({ ...p, jobClass: e.target.value }))}
                >
                  <option value="">직업 선택</option>
                  {JOB_GROUPS.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.jobs.map((job) => (
                        <option key={job} value={job}>{job}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="레벨 (선택)"
                type="number"
                placeholder="예: 260"
                value={form.level}
                onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
                min={1} max={300}
              />
              <Input
                label="초기 투자 비용"
                type="number"
                placeholder="부캐 육성 지출"
                value={form.initialInvestment}
                onChange={(e) => setForm((p) => ({ ...p, initialInvestment: e.target.value }))}
                min={0}
              />
            </div>
            <div>
              <Input
                label="솔 에르다 조각 보유량"
                type="number"
                placeholder="0"
                value={form.solErdaFragments}
                onChange={(e) => setForm((p) => ({ ...p, solErdaFragments: e.target.value }))}
                min={0}
              />
              {editingId && (
                <p className="text-xs mt-1 pl-1" style={{ color: 'var(--text-3)' }}>
                  사냥 기록 시 자동 누적됩니다. 맞지 않을 때만 수정하세요.
                </p>
              )}
            </div>
            {form.initialInvestment && (
              <p className="text-xs pl-1" style={{ color: 'var(--text-2)' }}>
                = {formatMeso(Number(form.initialInvestment))}
              </p>
            )}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isMain}
                onChange={(e) => setForm((p) => ({ ...p, isMain: e.target.checked }))}
                className="w-4 h-4 accent-orange-500 rounded"
              />
              <span className="text-sm" style={{ color: 'var(--text-2)' }}>메인 캐릭터</span>
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>취소</Button>
              <Button type="submit" size="sm" loading={submitting}>
                {editingId ? '수정하기' : '추가하기'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Empty state */}
      {characters.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <p className="text-3xl mb-2">🧙</p>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>캐릭터를 추가해보세요!</p>
          </div>
        </Card>
      )}

      {/* 솔 에르다 조각 합계 */}
      {characters.length > 0 && (
        <Card icon="🔮" title="솔 에르다 조각 보유 현황">
          <p className="text-xs mb-2" style={{ color: 'var(--text-2)' }}>
            캐릭터별로 보유한 조각 수를 입력하면 합계를 확인할 수 있습니다.
          </p>
          <div
            className="flex items-center justify-between px-3 py-2 rounded-xl"
            style={{ backgroundColor: 'var(--primary-dim)', border: '1px solid var(--primary-glow)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>전체 합계</span>
            <span className="font-bold" style={{ color: 'var(--primary)' }}>{totalFragments.toLocaleString()}개</span>
          </div>
        </Card>
      )}

      {/* Main characters */}
      {mainChars.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--primary)' }}>
            ⭐ 메인 캐릭터
          </p>
          {mainChars.map((c) => (
            <CharacterCard
              key={c.id}
              char={c}
              roi={rois[c.id]}
              onEdit={() => handleEdit(c)}
              onDelete={() => setDeleteConfirmId(c.id)}
            />
          ))}
        </div>
      )}

      {/* Sub characters */}
      {subChars.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-2)' }}>
            부캐릭터 ({subChars.length})
          </p>
          {subChars.map((c) => (
            <CharacterCard
              key={c.id}
              char={c}
              roi={rois[c.id]}
              onEdit={() => handleEdit(c)}
              onDelete={() => setDeleteConfirmId(c.id)}
            />
          ))}
        </div>
      )}

      {/* 캐릭터 삭제 확인 모달 */}
      {deleteConfirmId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm space-y-4"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <h2 className="font-bold text-lg" style={{ color: 'var(--text)' }}>캐릭터를 삭제하시겠습니까?</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
              캐릭터를 삭제하면 해당 캐릭터의 보스·사냥 기록에서 캐릭터 정보가 제거됩니다.
              기록 자체는 유지됩니다. 계속하시겠습니까?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>취소</Button>
              <Button
                onClick={handleDeleteConfirm}
                style={{ backgroundColor: 'var(--red)', color: '#fff', border: 'none' }}
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CharacterCard({
  char, roi, onEdit, onDelete,
}: {
  char: MapleCharacter
  roi?: CharacterROI
  onEdit: () => void
  onDelete: () => void
}) {
  const progressPct = roi
    ? roi.isBreakEvenReached
      ? 100
      : Math.min(99, Math.round((roi.cumulativeIncome / roi.initialInvestment) * 100))
    : 0

  return (
    <Card>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold" style={{ color: 'var(--text)' }}>{char.name}</span>
            {char.isMain && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: 'var(--primary-dim)', color: 'var(--primary)' }}
              >
                메인
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {char.jobClass && <span className="text-xs" style={{ color: 'var(--text-3)' }}>{char.jobClass}</span>}
            {char.level > 0 && <span className="text-xs" style={{ color: 'var(--text-3)' }}>Lv.{char.level}</span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={onEdit} className="text-xs px-2.5 py-1 rounded-lg" style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}>
            수정
          </button>
          <button onClick={onDelete} className="text-xs px-2.5 py-1 rounded-lg" style={{ color: 'var(--red)', border: '1px solid rgba(220,38,38,0.25)' }}>
            삭제
          </button>
        </div>
      </div>

      {/* 솔 에르다 조각 */}
      <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-2)' }}>🔮 솔 에르다 조각</span>
        <span className="font-semibold text-xs" style={{ color: 'var(--primary)' }}>
          {(char.solErdaFragments ?? 0).toLocaleString()}개
        </span>
      </div>

      {/* ROI section */}
      {char.initialInvestment > 0 && (
        <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>손익분기점</p>
            <p className="text-xs font-bold" style={{ color: roi?.isBreakEvenReached ? 'var(--green)' : 'var(--primary)' }}>
              {progressPct}%
            </p>
          </div>
          <div className="progress-track mb-2">
            <div
              className="progress-fill"
              style={{
                width: `${progressPct}%`,
                background: roi?.isBreakEvenReached
                  ? 'linear-gradient(90deg, #16A34A, #22C55E)'
                  : 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)',
              }}
            />
          </div>
          {roi ? (
            roi.isBreakEvenReached ? (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: 'var(--green)' }}>
                  ✅ 투자금 회수 완료!
                </span>
                <span className="text-xs" style={{ color: 'var(--text-2)' }}>
                  순수익 {formatMeso(roi.cumulativeIncome - roi.initialInvestment)}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div className="info-box text-center">
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-3)' }}>초기 투자</p>
                  <p className="font-bold text-xs" style={{ color: 'var(--red)' }}>{formatMeso(roi.initialInvestment)}</p>
                </div>
                <div className="info-box text-center">
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-3)' }}>누적 수입</p>
                  <p className="font-bold text-xs" style={{ color: 'var(--green)' }}>{formatMeso(roi.cumulativeIncome)}</p>
                </div>
                <div className="info-box text-center">
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-3)' }}>회수까지</p>
                  <p className="font-bold text-xs" style={{ color: 'var(--primary)' }}>약 {roi.weeksToBreakEven}주</p>
                </div>
              </div>
            )
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              수입 기록이 쌓이면 손익분기점이 계산됩니다.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
