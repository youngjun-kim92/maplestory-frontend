import client from './client'
import type { BossDrop, BossDropItem, BossDropSellRequest, BossKill, BossKillRequest, BossMaster, BossStats, DopingItem, MapleCharacter, ResetType } from '../types'
import type { FavoriteItem } from './favorites'

export interface BossPageInit {
  bossList: BossMaster[]
  dopingList: DopingItem[]
  characters: MapleCharacter[]
  allKills: BossKill[]
  allFavorites: FavoriteItem[]
}

// 서버별 init 캐시 (stale-while-revalidate용)
let _bossInitCache: { data: BossPageInit; serverId: number | null } | null = null
let _prefetchInFlight = false

export const bossInitCache = {
  get: (serverId: number | null): BossPageInit | null =>
    _bossInitCache?.serverId === serverId ? _bossInitCache.data : null,
  set: (data: BossPageInit, serverId: number | null) => {
    _bossInitCache = { data, serverId }
  },
  patchKills: (kills: BossKill[]) => {
    if (_bossInitCache) _bossInitCache = { ..._bossInitCache, data: { ..._bossInitCache.data, allKills: kills } }
  },
  patchFavorites: (favs: FavoriteItem[]) => {
    if (_bossInitCache) _bossInitCache = { ..._bossInitCache, data: { ..._bossInitCache.data, allFavorites: favs } }
  },
}

export function prefetchBossPage(serverId: number | null): void {
  if (_bossInitCache?.serverId === serverId) return
  if (_prefetchInFlight) return
  _prefetchInFlight = true
  client.get<BossPageInit>('/boss/init')
    .then((res) => {
      res.data.bossList = applyResetTypeOverrides(res.data.bossList)
      _bossInitCache = { data: res.data, serverId }
    })
    .catch(() => {})
    .finally(() => { _prefetchInFlight = false })
}

let _dopingCache: DopingItem[] | null = null
let _bossListCache: BossMaster[] | null = null

// 백엔드 데이터 오류 보정: (보스명, 난이도) → 올바른 resetType
const RESET_TYPE_OVERRIDES: Record<string, Record<string, ResetType>> = {
  '매그너스':   { easy: 'daily', normal: 'daily', hard: 'weekly' },
  '파풀라투스': { easy: 'daily', normal: 'daily' },
  '자쿰':       { easy: 'daily', normal: 'daily' },
  '벨룸':       { normal: 'daily' },
  '피에르':     { normal: 'daily' },
  '블러디퀸':   { normal: 'daily' },
  '반반':       { normal: 'daily' },
  '힐라':       { normal: 'daily' },
  '핑크빈':     { normal: 'daily', chaos: 'weekly' },
}

function applyResetTypeOverrides(list: BossMaster[]): BossMaster[] {
  return list.map((b) => {
    const overrides = RESET_TYPE_OVERRIDES[b.bossName]
    const corrected = overrides?.[b.difficulty.toLowerCase()]
    return corrected ? { ...b, resetType: corrected } : b
  })
}

export const bossApi = {
  getPageInit: async (): Promise<{ data: BossPageInit }> => {
    const res = await client.get<BossPageInit>('/boss/init')
    res.data.bossList = applyResetTypeOverrides(res.data.bossList)
    return res
  },

  getBossList: async (): Promise<{ data: BossMaster[] }> => {
    if (_bossListCache) return { data: _bossListCache }
    const res = await client.get<BossMaster[]>('/boss/list')
    const data = applyResetTypeOverrides(res.data)
    if (data.length > 0) _bossListCache = data
    return { ...res, data }
  },

  getDopingList: async (): Promise<{ data: DopingItem[] }> => {
    if (_dopingCache) return { data: _dopingCache }
    const res = await client.get<DopingItem[]>('/boss/doping/list')
    if (res.data.length > 0) _dopingCache = res.data
    return res
  },

  recordBossKill: (data: BossKillRequest) =>
    client.post<BossKill>('/boss/kill', data),

  getWeeklyBossKills: (params?: { week?: string; characterId?: number }) =>
    client.get<BossKill[]>('/boss/weekly', { params }),

  getBossStats: () =>
    client.get<BossStats[]>('/boss/stats'),

  // 드랍 가능 아이템 목록
  getDropItems: (bossName: string, difficulty: string) =>
    client.get<BossDropItem[]>('/boss/drops/items', {
      params: { bossName, difficulty: difficulty.toLowerCase() },
    }),

  // 드랍 아이템 기록
  recordDrop: (killId: number, itemName: string) =>
    client.post<BossDrop>(`/boss/kills/${killId}/drops`, { itemName }),

  // 경매장 등록 (holding → listed), body 없음
  listDrop: (dropId: number) =>
    client.patch<BossDrop>(`/boss/drops/${dropId}/list`),

  // 판매 처리 (listed → sold, 가계부 수익 자동 반영)
  sellDrop: (dropId: number, data: BossDropSellRequest) =>
    client.patch<BossDrop>(`/boss/drops/${dropId}/sell`, data),

  // 이번 주 드랍 목록
  getWeeklyDrops: (week?: string) =>
    client.get<BossDrop[]>('/boss/drops/weekly', { params: week ? { week } : {} }),

  // 특정 킬의 드랍 목록
  getKillDrops: (killId: number) =>
    client.get<BossDrop[]>(`/boss/kills/${killId}/drops`),

  getWeeklyCharacterCounts: (week?: string) =>
    client.get<{ characterId: number; characterName: string; weeklyBossCount: number }[]>(
      '/boss/weekly/character-counts',
      { params: week ? { week } : {} }
    ),

  deleteBossKill: (killId: number) =>
    client.delete(`/boss/kills/${killId}`),

  updateBossKill: (killId: number, data: { partySize: number }) =>
    client.patch<BossKill>(`/boss/kills/${killId}`, data),

  // 파티 분배 처리 (→ distributed, 가계부 수입 반영)
  distributeDrop: (dropId: number, data: { amount: number; distributeDate: string }) =>
    client.patch<BossDrop>(`/boss/drops/${dropId}/distribute`, data),

  // 드랍 기록 수정 (아이템명, 판매금액/날짜)
  updateDrop: (dropId: number, data: { itemName?: string; saleAmount?: number; saleDate?: string; isPcCafe?: boolean }) =>
    client.patch<BossDrop>(`/boss/drops/${dropId}`, data),

  // 드랍 기록 삭제 (sold/distributed면 가계부 항목도 함께 삭제)
  deleteDrop: (dropId: number) =>
    client.delete(`/boss/drops/${dropId}`),

  // sold/distributed/listed → holding 롤백 (가계부 원상복구)
  rollbackDrop: (dropId: number) =>
    client.patch<BossDrop>(`/boss/drops/${dropId}/rollback`),
}
