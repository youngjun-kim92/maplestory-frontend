import { useState, useEffect, useCallback } from 'react'
import { charactersApi } from '../api/characters'
import type { CharacterROI, MapleCharacter } from '../types'
import { formatMeso } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function CharactersPage() {
  const [characters, setCharacters] = useState<MapleCharacter[]>([])
  const [rois, setRois] = useState<Record<number, CharacterROI>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [form, setForm] = useState({
    name: '',
    jobClass: '',
    level: '',
    isMain: false,
    initialInvestment: '',
  })

  const fetchCharacters = useCallback(async () => {
    setLoading(true)
    try {
      const res = await charactersApi.getCharacters()
      setCharacters(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCharacters()
  }, [fetchCharacters])

  const loadROI = async (charId: number) => {
    if (rois[charId]) return
    try {
      const res = await charactersApi.getCharacterROI(charId)
      setRois((p) => ({ ...p, [charId]: res.data }))
    } catch {
      // 데이터 부족 시 무시
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) return
    setSubmitting(true)
    try {
      const payload = {
        name: form.name,
        jobClass: form.jobClass || undefined,
        level: form.level ? Number(form.level) : undefined,
        isMain: form.isMain,
        initialInvestment: form.initialInvestment ? Number(form.initialInvestment) : undefined,
      }
      if (editingId) {
        await charactersApi.updateCharacter(editingId, payload)
      } else {
        await charactersApi.createCharacter(payload)
      }
      resetForm()
      await fetchCharacters()
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setForm({ name: '', jobClass: '', level: '', isMain: false, initialInvestment: '' })
    setShowForm(false)
    setEditingId(null)
  }

  const handleEdit = (char: MapleCharacter) => {
    setForm({
      name: char.name,
      jobClass: char.jobClass || '',
      level: char.level ? String(char.level) : '',
      isMain: char.isMain,
      initialInvestment: char.initialInvestment ? String(char.initialInvestment) : '',
    })
    setEditingId(char.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('이 캐릭터를 삭제하시겠습니까?')) return
    await charactersApi.deleteCharacter(id)
    await fetchCharacters()
  }

  const mainChars = characters.filter((c) => c.isMain)
  const subChars = characters.filter((c) => !c.isMain)

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-orange-400 animate-pulse">불러오는 중...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">🧙 캐릭터 관리</h1>
        <Button
          onClick={() => {
            resetForm()
            setShowForm((v) => !v)
          }}
          size="sm"
        >
          {showForm ? '취소' : '+ 캐릭터 추가'}
        </Button>
      </div>

      {/* 캐릭터 추가/수정 폼 */}
      {showForm && (
        <Card title={editingId ? '캐릭터 수정' : '캐릭터 추가'} icon="🧙">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="캐릭터 이름 *"
                placeholder="닉네임"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                autoFocus
              />
              <Input
                label="직업 (선택)"
                placeholder="예: 아이언 불독"
                value={form.jobClass}
                onChange={(e) => setForm((p) => ({ ...p, jobClass: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="레벨 (선택)"
                type="number"
                placeholder="예: 260"
                value={form.level}
                onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
                min={1}
                max={300}
              />
              <Input
                label="초기 투자 비용 (선택)"
                type="number"
                placeholder="부캐 육성 지출 총액"
                value={form.initialInvestment}
                onChange={(e) => setForm((p) => ({ ...p, initialInvestment: e.target.value }))}
                min={0}
              />
            </div>
            {form.initialInvestment && (
              <p className="text-slate-400 text-xs">= {formatMeso(Number(form.initialInvestment))}</p>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isMain}
                onChange={(e) => setForm((p) => ({ ...p, isMain: e.target.checked }))}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-slate-300 text-sm">메인 캐릭터</span>
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={resetForm}>취소</Button>
              <Button type="submit" loading={submitting}>
                {editingId ? '수정하기' : '추가하기'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 메인 캐릭터 */}
      {mainChars.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-orange-400 font-medium text-sm">⭐ 메인 캐릭터</h2>
          {mainChars.map((char) => (
            <CharacterCard
              key={char.id}
              char={char}
              roi={rois[char.id]}
              onLoadROI={() => loadROI(char.id)}
              onEdit={() => handleEdit(char)}
              onDelete={() => handleDelete(char.id)}
            />
          ))}
        </div>
      )}

      {/* 부캐릭터 */}
      <div className="space-y-2">
        <h2 className="text-slate-400 font-medium text-sm">
          부캐릭터 ({subChars.length})
          <span className="text-slate-500 text-xs ml-2">— 손익분기점 계산 지원</span>
        </h2>
        {subChars.length === 0 && !mainChars.length ? (
          <Card>
            <p className="text-slate-500 text-sm text-center py-4">
              캐릭터를 추가해주세요.
            </p>
          </Card>
        ) : subChars.length === 0 ? (
          <Card>
            <p className="text-slate-500 text-sm text-center py-4">
              부캐릭터가 없습니다.
            </p>
          </Card>
        ) : (
          subChars.map((char) => (
            <CharacterCard
              key={char.id}
              char={char}
              roi={rois[char.id]}
              onLoadROI={() => loadROI(char.id)}
              onEdit={() => handleEdit(char)}
              onDelete={() => handleDelete(char.id)}
              showROI
            />
          ))
        )}
      </div>
    </div>
  )
}

function CharacterCard({
  char,
  roi,
  onLoadROI,
  onEdit,
  onDelete,
  showROI = false,
}: {
  char: MapleCharacter
  roi?: CharacterROI
  onLoadROI: () => void
  onEdit: () => void
  onDelete: () => void
  showROI?: boolean
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold">{char.name}</span>
            {char.isMain && (
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">메인</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            {char.jobClass && <span className="text-slate-400 text-xs">{char.jobClass}</span>}
            {char.level && <span className="text-slate-400 text-xs">Lv.{char.level}</span>}
            {char.initialInvestment > 0 && (
              <span className="text-slate-400 text-xs">
                투자: {formatMeso(char.initialInvestment)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="text-slate-400 hover:text-white text-xs">수정</button>
          <button onClick={onDelete} className="text-slate-600 hover:text-red-400 text-xs">삭제</button>
        </div>
      </div>

      {/* 부캐 ROI (기능 #8) */}
      {showROI && char.initialInvestment > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #2d3748' }}>
          {!roi ? (
            <button
              onClick={onLoadROI}
              className="text-xs text-slate-400 hover:text-orange-400 transition-colors underline"
            >
              손익분기점 계산하기
            </button>
          ) : roi.alreadyProfitable ? (
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-sm font-medium">✅ 투자금 회수 완료!</span>
              <span className="text-slate-400 text-xs">
                순수익: {formatMeso(roi.totalBossRevenue - roi.initialInvestment)}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg p-2" style={{ backgroundColor: '#0f1729' }}>
                <p className="text-slate-400 text-xs">초기 투자</p>
                <p className="text-red-400 text-sm font-medium">{formatMeso(roi.initialInvestment)}</p>
              </div>
              <div className="rounded-lg p-2" style={{ backgroundColor: '#0f1729' }}>
                <p className="text-slate-400 text-xs">주간 보스 수익</p>
                <p className="text-green-400 text-sm font-medium">{formatMeso(roi.weeklyBossRevenue)}</p>
              </div>
              <div className="rounded-lg p-2" style={{ backgroundColor: '#0f1729' }}>
                <p className="text-slate-400 text-xs">회수까지</p>
                <p className="text-orange-400 text-sm font-medium">약 {roi.weeksUntilBreakEven}주</p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
