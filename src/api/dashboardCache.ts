import { ledgerApi } from './ledger'
import { bossApi } from './boss'
import { charactersApi } from './characters'
import type { BossKill, BossDrop, CharacterStatsResponse, LedgerStat, MapleCharacter, WeeklyLedger, WeeklySummary } from '../types'

export interface DashboardSnapshot {
  weekStart: string
  ledger: WeeklyLedger | null
  allWeeks: WeeklySummary[]
  drops: BossDrop[]
  weeklyBossKills: BossKill[]
  characters: MapleCharacter[]
  charStats: CharacterStatsResponse[]
  charStats4w: CharacterStatsResponse[]
  catStats: LedgerStat[]
  charBossCounts: Map<number, number>
}

let _cache: { serverId: number | null; snapshot: DashboardSnapshot } | null = null
let _prefetchInFlight = false

export const dashboardCache = {
  get: (serverId: number | null, weekStart: string): DashboardSnapshot | null => {
    if (_cache?.serverId !== serverId || _cache?.snapshot.weekStart !== weekStart) return null
    return _cache.snapshot
  },
  set: (serverId: number | null, snapshot: DashboardSnapshot) => {
    _cache = { serverId, snapshot }
  },
}

export async function fetchDashboardParallel(weekStart: string): Promise<DashboardSnapshot> {
  const [ledger, allWeeks, drops, kills, chars, stats, stats4w, catStats, bossCounts] = await Promise.all([
    ledgerApi.getWeeklyLedger({ week: weekStart }),
    ledgerApi.getWeeksList(),
    bossApi.getWeeklyDrops(weekStart).catch(() => ({ data: [] as BossDrop[] })),
    bossApi.getWeeklyBossKills({ week: weekStart }),
    charactersApi.getCharacters(),
    charactersApi.getCharacterStats(),
    charactersApi.getCharacterStats(4),
    ledgerApi.getCategoryStats(4).catch(() => ({ data: [] as LedgerStat[] })),
    bossApi.getWeeklyCharacterCounts(weekStart),
  ])
  const charBossCounts = new Map<number, number>()
  bossCounts.data.forEach((d: { characterId: number; weeklyBossCount: number }) =>
    charBossCounts.set(d.characterId, d.weeklyBossCount)
  )
  return {
    weekStart,
    ledger: ledger.data,
    allWeeks: allWeeks.data,
    drops: drops.data,
    weeklyBossKills: kills.data,
    characters: chars.data,
    charStats: stats.data,
    charStats4w: stats4w.data,
    catStats: catStats.data,
    charBossCounts,
  }
}

export function prefetchDashboard(serverId: number | null, weekStart: string): void {
  if (_cache?.serverId === serverId && _cache?.snapshot.weekStart === weekStart) return
  if (_prefetchInFlight) return
  _prefetchInFlight = true
  fetchDashboardParallel(weekStart)
    .then((snapshot) => { _cache = { serverId, snapshot } })
    .catch(() => {})
    .finally(() => { _prefetchInFlight = false })
}
