import { useState, useEffect, useCallback, useMemo } from 'react'
import { bossApi } from '../api/boss'
import { charactersApi } from '../api/characters'
import { favoritesApi } from '../api/favorites'
import type { FavoriteItem } from '../api/favorites'
import { useAuth } from '../contexts/AuthContext'
import type { BossDropItem, BossKill, BossMaster, DopingItem, MapleCharacter, ResetType } from '../types'
import { formatMeso, toDateString, difficultyLabel } from '../utils/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import Input from '../components/ui/Input'
import Toast from '../components/ui/Toast'

const DROP_CATEGORY_LABELS: Record<string, string> = {
  dark_accessory:    '칠흑 장신구',
  radiant_accessory: '광휘 장신구',
  dawn_accessory:    '여명 장신구',
  other:             '기타',
}

const RESET_TYPE_TABS: { key: ResetType | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'daily', label: '일간' },
  { key: 'weekly', label: '주간' },
  { key: 'monthly', label: '월간' },
]

const WEEKLY_BOSS_MAX_PER_CHAR = 12
const WEEKLY_BOSS_MAX_TOTAL = 90

export default function BossPage() {
  const { user, refreshUser } = useAuth()

  const [bossList, setBossList] = useState<BossMaster[]>([])
  const [weeklyKills, setWeeklyKills] = useState<BossKill[]>([])
  const [allWeeklyKills, setAllWeeklyKills] = useState<BossKill[]>([])
  const [characters, setCharacters] = useState<MapleCharacter[]>([])
  const [bossFavorites, setBossFavorites] = useState<FavoriteItem[]>([])
  const [dopingFavorites, setDopingFavorites] = useState<FavoriteItem[]>([])
  const [dopingItems, setDopingItems] = useState<DopingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [savingSingleFav, setSavingSingleFav] = useState(false)
  const [selectedCharId, setSelectedCharId] = useState('')

  const [form, setForm] = useState({
    bossName: '',
    difficulty: '',
    killDate: toDateString(),
    partySize: 1,
    resetFilter: 'all' as ResetType | 'all',
  })
  const [charError, setCharError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null)

  const [selectedDopings, setSelectedDopings] = useState<number[]>([])
  const [dropItems, setDropItems] = useState<BossDropItem[]>([])
  const [checkedDrops, setCheckedDrops] = useState<Set<string>>(new Set())
  const [editingKillId, setEditingKillId] = useState<number | null>(null)
  const [editPartySize, setEditPartySize] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [list, chars, dopings] = await Promise.all([
        bossApi.getBossList(),
        charactersApi.getCharacters(),
        bossApi.getDopingList(),
      ])
      setBossList(list.data)
      const charList = chars.data
      setCharacters(charList)
      setDopingItems(dopings.data)
      const mainChar = charList.find((c) => c.isMain) ?? charList[0]
      if (mainChar) {
        setSelectedCharId((prev) => prev || String(mainChar.id))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchKills = useCallback(async (charId: string) => {
    if (!charId) return
    const res = await bossApi.getWeeklyBossKills({ characterId: Number(charId) })
    setWeeklyKills(res.data)
  }, [])

  const fetchAllKills = useCallback(async () => {
    const res = await bossApi.getWeeklyBossKills()
    setAllWeeklyKills(res.data)
  }, [])

  const fetchFavorites = useCallback(async (charId: string) => {
    if (!charId) return
    const cid = Number(charId)
    const [bFavs, dFavs] = await Promise.all([
      favoritesApi.getAll('BOSS', { characterId: cid }),
      favoritesApi.getAll('DOPING', { characterId: cid }),
    ])
    setBossFavorites(bFavs.data)
    setDopingFavorites(dFavs.data)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (selectedCharId) {
      fetchFavorites(selectedCharId)
      fetchKills(selectedCharId)
      fetchAllKills()
    }
  }, [selectedCharId, fetchFavorites, fetchKills, fetchAllKills])

  useEffect(() => {
    if (!form.bossName || !form.difficulty) {
      setDropItems([])
      setCheckedDrops(new Set())
      return
    }
    bossApi.getDropItems(form.bossName, form.difficulty)
      .then(r => setDropItems(r.data))
      .catch(() => setDropItems([]))
  }, [form.bossName, form.difficulty])

  const filteredBossList = form.resetFilter === 'all'
    ? bossList
    : bossList.filter((b) => b.resetType === form.resetFilter)

  const uniqueBossNames = [...new Set(filteredBossList.map((b) => b.bossName))]
  const difficultiesForBoss = filteredBossList
    .filter((b) => b.bossName === form.bossName)
    .map((b) => b.difficulty)

  const selectedBoss = bossList.find(
    (b) => b.bossName === form.bossName && b.difficulty === form.difficulty
  )

  const weeklyBossKillSet = useMemo(() => {
    const weeklyBossNames = new Set(
      bossList.filter((b) => b.resetType === 'weekly').map((b) => b.bossName + '|' + b.difficulty)
    )
    return weeklyKills.filter((k) =>
      k.resetType ? k.resetType === 'weekly' : weeklyBossNames.has(k.bossName + '|' + k.difficulty)
    )
  }, [bossList, weeklyKills])

  const charWeeklyCount = weeklyBossKillSet.length

  const allWeeklyBossKillSet = useMemo(() => {
    const weeklyBossNames = new Set(
      bossList.filter((b) => b.resetType === 'weekly').map((b) => b.bossName + '|' + b.difficulty)
    )
    return allWeeklyKills.filter((k) =>
      k.resetType ? k.resetType === 'weekly' : weeklyBossNames.has(k.bossName + '|' + k.difficulty)
    )
  }, [bossList, allWeeklyKills])

  const totalWeeklyCount = allWeeklyBossKillSet.length

  const charWeeklyCountMap = useMemo(() => {
    const map = new Map<number, { name: string; count: number }>()
    for (const k of allWeeklyBossKillSet) {
      if (k.characterId == null) continue
      const existing = map.get(k.characterId)
      if (existing) {
        existing.count++
      } else {
        const char = characters.find((c) => c.id === k.characterId)
        map.set(k.characterId, { name: char?.name ?? String(k.characterId), count: 1 })
      }
    }
    return map
  }, [allWeeklyBossKillSet, characters])

  const handleBossNameChange = (name: string) => {
    const diffs = filteredBossList.filter((b) => b.bossName === name).map((b) => b.difficulty)
    setForm((p) => ({ ...p, bossName: name, difficulty: diffs[0] || '', partySize: 1 }))
    setSelectedDopings([])
    setCheckedDrops(new Set())
  }

  const handleResetFilterChange = (filter: ResetType | 'all') => {
    setForm((p) => ({ ...p, resetFilter: filter, bossName: '', difficulty: '' }))
    setSelectedDopings([])
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form.bossName || !form.difficulty) return
    if (!selectedCharId) { setCharError('캐릭터를 선택해주세요.'); return }
    setCharError('')
    setSubmitting(true)
    try {
      const expenses = selectedDopings.length > 0
        ? selectedDopings
            .map((id) => dopingItems.find((x) => x.id === id))
            .filter((item): item is DopingItem => !!item)
            .map((item) => ({ category: 'doping', amount: item.price, description: item.name }))
        : []

      const killRes = await bossApi.recordBossKill({
        bossName: form.bossName,
        difficulty: form.difficulty,
        killDate: form.killDate,
        partySize: form.partySize,
        characterId: Number(selectedCharId),
        expenses,
      })

      if (checkedDrops.size > 0) {
        await Promise.all(
          [...checkedDrops].map(itemName => bossApi.recordDrop(killRes.data.id, itemName))
        )
        setCheckedDrops(new Set())
      }

      await fetchKills(selectedCharId)
      await fetchAllKills()
      await refreshUser()
    } catch (err: any) {
      const status = err?.response?.status
      const msg: string = err?.response?.data?.message ?? ''
      if (status === 409) {
        if (msg.includes('12') || msg.includes('한도') || msg.includes('초과')) {
          setToast({ message: '이번 주 주간 보스 12개를 모두 처치했습니다.', type: 'warning' })
        } else {
          setToast({ message: '이미 이번 주에 처치한 보스입니다.', type: 'error' })
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  const applyFavorite = async (fav: FavoriteItem) => {
    if (!fav.bossName) return
    const diffs = bossList.filter((b) => b.bossName === fav.bossName).map((b) => b.difficulty)
    const diff = fav.difficulty || diffs[0] || ''
    setForm((p) => ({
      ...p,
      bossName: fav.bossName!,
      difficulty: diff,
      resetFilter: 'all',
      partySize: fav.partySize ?? 1,
    }))

    if (selectedCharId && fav.bossName) {
      try {
        const res = await favoritesApi.getAll('DOPING', {
          characterId: Number(selectedCharId),
          bossName: fav.bossName,
        })
        const dopingFavLabels = new Set(res.data.map((d) => d.label))
        const matchingIds = dopingItems
          .filter((item) => dopingFavLabels.has(item.name))
          .map((item) => item.id)
        setSelectedDopings(matchingIds)
      } catch {
        setSelectedDopings([])
      }
    } else {
      setSelectedDopings([])
    }
  }

  const handleSaveSingleBossFav = async () => {
    if (!form.bossName || !form.difficulty || !selectedCharId) return
    const charId = Number(selectedCharId)
    setSavingSingleFav(true)
    try {
      await favoritesApi.create({
        type: 'BOSS',
        label: `${form.bossName} ${difficultyLabel(form.difficulty)}`,
        bossName: form.bossName,
        difficulty: form.difficulty,
        partySize: form.partySize,
        characterId: charId,
      })
      for (const dopingId of selectedDopings) {
        const item = dopingItems.find((x) => x.id === dopingId)
        if (item) {
          await favoritesApi.create({
            type: 'DOPING',
            label: item.name,
            bossName: form.bossName,
            amount: item.price,
            description: item.name,
            characterId: charId,
          })
        }
      }
      await fetchFavorites(selectedCharId)
      setToast({ message: '즐겨찾기에 저장되었습니다.', type: 'success' })
    } catch (err: any) {
      if (err?.response?.status === 400) {
        setToast({ message: '즐겨찾기는 캐릭터당 최대 12개까지 저장할 수 있습니다.', type: 'error' })
      }
    } finally {
      setSavingSingleFav(false)
    }
  }

  const handleDeleteFav = async (id: number) => {
    if (!confirm('즐겨찾기를 삭제하시겠습니까?')) return
    await favoritesApi.delete(id)
    if (selectedCharId) await fetchFavorites(selectedCharId)
  }

  const handleDeleteKill = async (killId: number) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return
    await bossApi.deleteBossKill(killId)
    await fetchKills(selectedCharId)
    await fetchAllKills()
    await refreshUser()
  }

  const handleUpdateKill = async (killId: number, partySize: number) => {
    await bossApi.updateBossKill(killId, { partySize })
    setEditingKillId(null)
    await fetchKills(selectedCharId)
    await fetchAllKills()
    await refreshUser()
  }

  const totalWeeklyRevenue = allWeeklyKills.reduce((s, k) => s + (k.income ?? k.crystalPrice), 0)
  const isWeeklyBossSelected = selectedBoss?.resetType === 'weekly'
  const maxPartySize = selectedBoss?.maxPartySize ?? 6
  const alreadySaved = bossFavorites.some(
    f => f.bossName === form.bossName && f.difficulty === form.difficulty && !!form.bossName && !!form.difficulty
  )

  const dopingTotal = selectedDopings.reduce((sum, id) => {
    const item = dopingItems.find((x) => x.id === id)
    return sum + (item?.price ?? 0)
  }, 0)
  const isDopingInsufficientMeso = dopingTotal > 0 && dopingTotal > (user?.totalMeso ?? 0)

  const selectedChar = characters.find((c) => String(c.id) === selectedCharId)

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-orange-400 animate-pulse">불러오는 중...</div>
  }

  return (
    <div className="space-y-3">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>⚔️ 보스 처치</h1>
        {characters.length > 0 && (
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
        )}
      </div>

      {/* 주간 수익 요약 */}
      <div
        className="px-4 py-3 rounded-xl space-y-2"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>이번 주 보스 수익</p>
            <p className="font-bold text-xl mt-0.5" style={{ color: 'var(--primary)' }}>{formatMeso(totalWeeklyRevenue)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>주간 보스 합계</p>
            <p className="font-bold text-xl mt-0.5" style={{ color: totalWeeklyCount >= WEEKLY_BOSS_MAX_TOTAL ? 'var(--red)' : 'var(--text)' }}>
              {totalWeeklyCount} / {WEEKLY_BOSS_MAX_TOTAL}
            </p>
          </div>
        </div>
        {charWeeklyCountMap.size > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[...charWeeklyCountMap.entries()].map(([charId, { name, count }]) => (
              <span
                key={charId}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: count >= WEEKLY_BOSS_MAX_PER_CHAR ? 'rgba(220,38,38,0.12)' : 'rgba(63,185,80,0.12)',
                  color: count >= WEEKLY_BOSS_MAX_PER_CHAR ? 'var(--red)' : 'var(--green)',
                }}
              >
                {name} {count}/{WEEKLY_BOSS_MAX_PER_CHAR}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── 즐겨찾기 섹션 ── */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>⭐ 즐겨찾기</p>
        </div>
        <div className="px-4 py-2.5 text-xs" style={{ backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--text-2)' }}>
          자주 사용하는 보스 설정을 저장해두면 클릭 한 번으로 바로 입력됩니다.
          캐릭터를 선택한 뒤 <span style={{ color: '#fbbf24' }}>★ 즐겨찾기 등록</span> 버튼으로 저장하세요.
        </div>
        <div className="p-3 space-y-2.5">
          {bossFavorites.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-3)' }}>
              보스 처치 기록에서 "⭐ 즐겨찾기 저장" 버튼으로 추가해보세요!
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {bossFavorites.map((fav) => {
                const relatedDopings = dopingFavorites.filter((d) => d.bossName === fav.bossName)
                return (
                  <div
                    key={fav.id}
                    className="relative rounded-xl p-3 cursor-pointer transition-all group"
                    style={{ backgroundColor: 'var(--surface-2)', border: '1.5px solid var(--border)' }}
                    onClick={() => applyFavorite(fav)}
                  >
                    <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFav(fav.id) }}
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--surface)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.25)' }}
                      >삭제</button>
                    </div>
                    <p className="text-sm font-semibold pr-10 leading-tight" style={{ color: 'var(--text)' }}>{fav.label}</p>
                    {fav.bossName && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                        {fav.bossName}
                        {fav.difficulty && ` · ${difficultyLabel(fav.difficulty)}`}
                        {fav.partySize && fav.partySize > 1 && ` · ${fav.partySize}인`}
                      </p>
                    )}
                    {relatedDopings.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {relatedDopings.map((d) => (
                          <p key={d.id} className="text-xs" style={{ color: 'var(--text-3)' }}>
                            💊 {d.label}{d.amount ? ` ${formatMeso(d.amount)}` : ''}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 보스 처치 기록 폼 ── */}
      <Card icon="⚔️">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>보스 처치 기록</p>
          <button
            type="button"
            onClick={handleSaveSingleBossFav}
            disabled={savingSingleFav || !form.bossName || !form.difficulty || !selectedCharId}
            className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
            style={
              alreadySaved
                ? { backgroundColor: 'rgba(251,191,36,0.25)', color: '#f59e0b', border: '1.5px solid rgba(251,191,36,0.5)' }
                : form.bossName && form.difficulty && selectedCharId
                  ? { backgroundColor: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }
                  : { backgroundColor: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)', opacity: 0.5, cursor: 'not-allowed' }
            }
            title="현재 보스·난이도·파티인원·도핑을 즐겨찾기로 저장"
          >
            {savingSingleFav ? '저장 중...' : alreadySaved ? '⭐ 즐겨찾기 저장됨' : '★ 즐겨찾기 등록'}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {characters.length === 0 && (
            <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--primary-dim)', border: '1px solid var(--primary-glow)' }}>
              <p style={{ color: 'var(--primary)' }}>
                캐릭터를 먼저 등록해주세요.{' '}
                <a href="/characters" className="underline font-semibold">캐릭터 등록 →</a>
              </p>
            </div>
          )}

          {selectedCharId && (
            <div className="flex items-center gap-4 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--surface-2)' }}>
              <span style={{ color: 'var(--text-2)' }}>
                이 캐릭터 주간 보스:
                <span className="font-bold ml-1" style={{ color: charWeeklyCount >= WEEKLY_BOSS_MAX_PER_CHAR ? 'var(--red)' : 'var(--green)' }}>
                  {charWeeklyCount} / {WEEKLY_BOSS_MAX_PER_CHAR}
                </span>
              </span>
              <span style={{ color: 'var(--text-2)' }}>
                전체:
                <span className="font-bold ml-1" style={{ color: totalWeeklyCount >= WEEKLY_BOSS_MAX_TOTAL ? 'var(--red)' : 'var(--text)' }}>
                  {totalWeeklyCount} / {WEEKLY_BOSS_MAX_TOTAL}
                </span>
              </span>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>일간·월간: 제한 없음</span>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-2)' }}>보스 유형</p>
            <div className="flex gap-1.5 flex-wrap">
              {RESET_TYPE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleResetFilterChange(tab.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={
                    form.resetFilter === tab.key
                      ? { backgroundColor: 'rgba(249,115,22,0.18)', color: 'var(--primary)', border: '1px solid rgba(249,115,22,0.4)' }
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
            <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--bg)', border: '1px solid rgba(249,115,22,0.4)' }}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>결정석 가격:</span>
                <span className="font-bold" style={{ color: 'var(--text)' }}>{formatMeso(selectedBoss.crystalPrice)}</span>
              </div>
              {isWeeklyBossSelected && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(249,115,22,0.12)', color: 'var(--primary)' }}>
                  주간 보스
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="처치 날짜"
              type="date"
              value={form.killDate}
              onChange={(e) => setForm((p) => ({ ...p, killDate: e.target.value }))}
            />
            <Select
              label="파티 인원"
              options={Array.from({ length: maxPartySize }, (_, i) => i + 1).map((n) => ({ value: String(n), label: `${n}인` }))}
              value={String(form.partySize)}
              onChange={(e) => setForm((p) => ({ ...p, partySize: Number(e.target.value) }))}
            />
          </div>

          {dopingItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-2)' }}>
                💊 도핑 (중복 선택 가능, 선택 시 지출 자동 기록)
              </p>
              <div className="flex flex-wrap gap-2">
                {dopingItems.map((item) => {
                  const checked = selectedDopings.includes(item.id)
                  return (
                    <label
                      key={item.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer select-none transition-all text-sm"
                      style={
                        checked
                          ? { backgroundColor: 'var(--primary-dim)', color: 'var(--primary)', border: '1.5px solid var(--primary-glow)' }
                          : { backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }
                      }
                      title={item.effect}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedDopings((prev) =>
                            prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id]
                          )
                        }
                        className="w-3.5 h-3.5"
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span>{item.name}</span>
                      <span className="text-xs ml-1" style={{ color: checked ? 'var(--primary)' : 'var(--text-3)' }}>
                        {item.price.toLocaleString()}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {dropItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-2)' }}>
                📦 드랍 물욕템 체크리스트
              </p>
              <div className="flex flex-wrap gap-2">
                {dropItems.map((item) => {
                  const checked = checkedDrops.has(item.itemName)
                  return (
                    <label
                      key={item.itemName}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer select-none transition-all text-sm"
                      style={
                        checked
                          ? { backgroundColor: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1.5px solid rgba(251,191,36,0.3)' }
                          : { backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }
                      }
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setCheckedDrops((prev) => {
                            const next = new Set(prev)
                            if (next.has(item.itemName)) next.delete(item.itemName)
                            else next.add(item.itemName)
                            return next
                          })
                        }
                        className="sr-only"
                      />
                      <span>{item.itemName}</span>
                      <span className="text-xs ml-1" style={{ color: checked ? '#fbbf24' : 'var(--text-3)' }}>
                        {DROP_CATEGORY_LABELS[item.itemCategory] ?? item.itemCategory}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {charError && <p className="text-xs" style={{ color: 'var(--red)' }}>{charError}</p>}
          {isDopingInsufficientMeso && (
            <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}>
              ⚠️ 현재 보유 메소({formatMeso(user?.totalMeso ?? 0)})보다 도핑 비용({formatMeso(dopingTotal)})이 많습니다. 인벤토리/창고 메소를 먼저 업데이트해주세요.
            </div>
          )}
          <div className="flex justify-end">
            <Button type="submit" loading={submitting} disabled={!form.bossName || !form.difficulty || characters.length === 0 || isDopingInsufficientMeso}>
              기록하기
            </Button>
          </div>
        </form>
      </Card>

      {/* ── 이번 주 처치 목록 ── */}
      <div>
        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>📋 이번 주 보스 처치 목록</p>

        {weeklyKills.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-xs px-2.5 py-1 rounded-full shrink-0 font-medium"
              style={{
                backgroundColor: charWeeklyCount >= WEEKLY_BOSS_MAX_PER_CHAR
                  ? 'rgba(220,38,38,0.12)'
                  : 'rgba(63,185,80,0.12)',
                color: charWeeklyCount >= WEEKLY_BOSS_MAX_PER_CHAR ? 'var(--red)' : 'var(--green)',
              }}
            >
              주간 {charWeeklyCount}/{WEEKLY_BOSS_MAX_PER_CHAR}
            </span>
          </div>
        )}

        {weeklyKills.length === 0 ? (
          <div
            className="rounded-xl px-4 py-8 text-sm text-center"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-3)' }}
          >
            {selectedChar
              ? `${selectedChar.name}의 이번 주 처치 기록이 없습니다.`
              : '이번 주 처치 기록이 없습니다.'}
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>
                {weeklyKills.length}회 처치
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                +{formatMeso(weeklyKills.reduce((s, k) => s + (k.income ?? k.crystalPrice), 0))}
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {weeklyKills.map((kill) => {
                const income = kill.income ?? kill.crystalPrice
                const expense = kill.totalExpense ?? 0
                const net = income - expense
                const isEditing = editingKillId === kill.id
                return (
                  <div key={kill.id} className="flex items-start justify-between px-3 py-2 gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{kill.bossName}</span>
                      <span className="text-xs ml-1.5" style={{ color: 'var(--text-2)' }}>{difficultyLabel(kill.difficulty)}</span>
                      {isEditing ? (
                        <span className="inline-flex items-center gap-1 ml-1">
                          <select
                            value={editPartySize}
                            onChange={(e) => setEditPartySize(Number(e.target.value))}
                            className="text-xs px-1 py-0.5 rounded border"
                            style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
                          >
                            {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>{n}인</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleUpdateKill(kill.id, editPartySize)}
                            className="text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{ backgroundColor: 'rgba(63,185,80,0.15)', color: 'var(--green)', border: '1px solid rgba(63,185,80,0.3)' }}
                          >저장</button>
                          <button
                            onClick={() => setEditingKillId(null)}
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ color: 'var(--text-3)' }}
                          >취소</button>
                        </span>
                      ) : (
                        kill.partySize && kill.partySize > 1 && (
                          <span className="text-xs ml-1" style={{ color: 'var(--text-3)' }}>{kill.partySize}인</span>
                        )
                      )}
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{kill.killDate?.slice(5)}</p>
                    </div>
                    <div className="flex items-start gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-semibold text-sm" style={{ color: 'var(--primary)' }}>
                          +{formatMeso(income)}
                        </p>
                        {expense > 0 && (
                          <p className="text-xs" style={{ color: 'var(--red)' }}>
                            -{formatMeso(expense)}
                          </p>
                        )}
                        {expense > 0 && (
                          <p className="text-xs font-semibold" style={{ color: net >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            {net >= 0 ? '+' : ''}{formatMeso(net)}
                          </p>
                        )}
                      </div>
                      {!isEditing && (
                        <div className="flex flex-col gap-1 mt-0.5">
                          <button
                            onClick={() => { setEditingKillId(kill.id); setEditPartySize(kill.partySize ?? 1) }}
                            className="text-xs px-1.5 py-0.5 rounded transition-colors"
                            style={{ color: 'var(--text-3)', backgroundColor: 'var(--surface-2)' }}
                            title="인원 수정"
                          >✏️</button>
                          <button
                            onClick={() => handleDeleteKill(kill.id)}
                            className="text-xs px-1.5 py-0.5 rounded transition-colors"
                            style={{ color: 'var(--text-3)', backgroundColor: 'var(--surface-2)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
                            title="삭제"
                          >✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
