import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { favoritesApi, type FavoriteItem, type FavoriteType } from '../api/favorites'
import { bossApi } from '../api/boss'
import type { BossMaster } from '../types'
import { formatMeso, difficultyLabel } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'

const DIFFICULTY_OPTIONS = [
  { value: 'easy',    label: '이지' },
  { value: 'normal',  label: '노말' },
  { value: 'hard',    label: '하드' },
  { value: 'chaos',   label: '카오스' },
  { value: 'extreme', label: '익스트림' },
]

export default function FavoritesPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<FavoriteType>('BOSS')
  const [items, setItems] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [bossList, setBossList] = useState<BossMaster[]>([])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await favoritesApi.getAll(tab)
      setItems(res.data)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { fetchItems() }, [fetchItems])
  useEffect(() => {
    bossApi.getBossList().then((r) => setBossList(r.data)).catch(() => {})
  }, [])

  const uniqueBossNames = [...new Set(bossList.map((b) => b.bossName))]

  const handleDelete = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return
    await favoritesApi.delete(id)
    fetchItems()
  }

  const handleBossCardClick = (item: FavoriteItem) => {
    navigate('/boss', {
      state: {
        prefill: {
          bossName: item.bossName,
          difficulty: item.difficulty,
          partySize: item.partySize,
        },
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-heading" style={{ color: 'var(--text)' }}>⭐ 즐겨찾기</h1>
        <Button size="sm" onClick={() => setShowAddModal(true)}>+ 추가</Button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {([['BOSS', '보스 템플릿'], ['DOPING', '도핑 템플릿']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="tab-btn"
            style={tab === key ? { color: 'var(--primary)', borderBottomColor: 'var(--primary)', fontWeight: 600 } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 카드 목록 */}
      {loading ? (
        <p className="text-sm text-center py-8 animate-pulse" style={{ color: 'var(--text-3)' }}>불러오는 중...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-2">
            {tab === 'BOSS'
              ? <img src="/maple-icons/boss.png" alt="" width={36} height={36} className="opacity-30 mx-auto" style={{ imageRendering: 'pixelated' }} />
              : <span className="text-3xl">💊</span>
            }
          </div>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            {tab === 'BOSS' ? '자주 가는 보스를 템플릿으로 저장해보세요.' : '자주 쓰는 도핑을 템플릿으로 저장해보세요.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl p-4 relative transition-all"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                cursor: tab === 'BOSS' ? 'pointer' : 'default',
              }}
              onClick={tab === 'BOSS' ? () => handleBossCardClick(item) : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                    {item.label}
                  </p>
                  {tab === 'BOSS' && item.bossName && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                      {item.bossName} {item.difficulty ? difficultyLabel(item.difficulty) : ''}
                      {item.partySize && item.partySize > 1 ? ` · ${item.partySize}인 파티` : ''}
                    </p>
                  )}
                  {tab === 'DOPING' && (
                    <>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                        {item.bossName ? item.bossName + ' 전용' : '공통 (모든 보스)'}
                      </p>
                      {item.amount && item.amount > 0 && (
                        <p className="text-xs font-semibold mt-1" style={{ color: 'var(--red)' }}>
                          -{formatMeso(item.amount)} 메소
                        </p>
                      )}
                      {item.description && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{item.description}</p>
                      )}
                    </>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                  className="text-xs w-6 h-6 flex items-center justify-center rounded transition-all shrink-0"
                  style={{ color: 'var(--text-3)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
                >✕</button>
              </div>
              {tab === 'BOSS' && (
                <p className="text-xs mt-2" style={{ color: 'var(--primary)', opacity: 0.7 }}>
                  클릭하여 보스 폼으로 이동 →
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 추가 모달 */}
      {showAddModal && (
        <AddFavoriteModal
          tab={tab}
          uniqueBossNames={uniqueBossNames}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchItems() }}
        />
      )}
    </div>
  )
}

function AddFavoriteModal({
  tab,
  uniqueBossNames,
  onClose,
  onSaved,
}: {
  tab: FavoriteType
  uniqueBossNames: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    label: '', bossName: '', difficulty: 'hard', partySize: '1',
    amount: '', description: '',
  })

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form.label.trim()) return
    setSubmitting(true)
    try {
      await favoritesApi.create({
        type: tab,
        label: form.label.trim(),
        bossName: form.bossName || null,
        difficulty: tab === 'BOSS' && form.difficulty ? form.difficulty : null,
        partySize: tab === 'BOSS' && form.partySize ? Number(form.partySize) : null,
        amount: tab === 'DOPING' && form.amount ? Number(form.amount) : null,
        description: form.description || null,
      })
      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-sm space-y-4"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base" style={{ color: 'var(--text)' }}>
            {tab === 'BOSS'
              ? <span className="flex items-center gap-1.5"><img src="/maple-icons/boss.png" alt="" width={18} height={18} style={{ imageRendering: 'pixelated' }} /> 보스 템플릿 추가</span>
              : '💊 도핑 템플릿 추가'
            }
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-sm"
            style={{ color: 'var(--text-3)', backgroundColor: 'var(--surface-2)' }}
          >✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label="라벨 *"
            placeholder={tab === 'BOSS' ? '예: 루시드 하드 2인' : '예: 세이람의 영약'}
            value={form.label}
            onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
            autoFocus
          />

          {tab === 'BOSS' ? (
            <>
              <Select
                label="보스명"
                options={[
                  { value: '', label: '보스 선택' },
                  ...uniqueBossNames.map((n) => ({ value: n, label: n })),
                ]}
                value={form.bossName}
                onChange={(e) => setForm((p) => ({ ...p, bossName: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="난이도"
                  options={DIFFICULTY_OPTIONS}
                  value={form.difficulty}
                  onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                />
                <Input
                  label="파티 인원"
                  type="number"
                  min={1} max={6}
                  value={form.partySize}
                  onChange={(e) => setForm((p) => ({ ...p, partySize: e.target.value }))}
                />
              </div>
            </>
          ) : (
            <>
              <Select
                label="보스명 (비워두면 공통)"
                options={[
                  { value: '', label: '공통 (모든 보스)' },
                  ...uniqueBossNames.map((n) => ({ value: n, label: n })),
                ]}
                value={form.bossName}
                onChange={(e) => setForm((p) => ({ ...p, bossName: e.target.value }))}
              />
              <Input
                label="금액 (메소)"
                type="number"
                placeholder="예: 2000000"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                min={0}
              />
              <Input
                label="설명 (선택)"
                placeholder="예: 루시드 입장 전 사용"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="flex-1">취소</Button>
            <Button type="submit" size="sm" loading={submitting} className="flex-1">저장</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
