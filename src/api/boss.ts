import client from './client'
import type { BossDrop, BossDropItem, BossDropSellRequest, BossKill, BossKillRequest, BossMaster, BossStats } from '../types'

export const bossApi = {
  getBossList: () =>
    client.get<BossMaster[]>('/boss/list'),

  recordBossKill: (data: BossKillRequest) =>
    client.post<BossKill>('/boss/kill', data),

  getWeeklyBossKills: (week?: string) =>
    client.get<BossKill[]>('/boss/weekly', { params: week ? { week } : {} }),

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
}
