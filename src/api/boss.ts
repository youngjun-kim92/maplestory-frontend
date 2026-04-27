import client from './client'
import type { BossKill, BossKillRequest, BossMaster, BossStats } from '../types'

export const bossApi = {
  getBossList: () =>
    client.get<BossMaster[]>('/boss/list'),

  recordBossKill: (data: BossKillRequest) =>
    client.post<BossKill>('/boss/kill', data),

  getWeeklyBossKills: (week?: string) =>
    client.get<BossKill[]>('/boss/weekly', { params: week ? { week } : {} }),

  getBossStats: () =>
    client.get<BossStats[]>('/boss/stats'),
}
