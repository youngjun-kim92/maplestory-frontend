import client from './client'
import type { BossDrop, BossDropItem, BossDropSellRequest, BossKill, BossKillRequest, BossMaster, BossStats, DopingItem, ResetType } from '../types'

let _dopingCache: DopingItem[] | null = null

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
  getBossList: () =>
    client.get<BossMaster[]>('/boss/list').then((res) => ({
      ...res,
      data: applyResetTypeOverrides(res.data),
    })),

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
}
