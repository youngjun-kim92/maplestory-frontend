// ====== 인증 타입 ======
export interface AuthResponse {
  token: string
}

export interface UserResponse {
  id: number
  nickname: string
  solErdaFragmentPrice: number
  inventoryMeso: number
  storageMeso: number
  totalMeso: number
  createdAt: string
}

export interface LoginRequest {
  nickname: string
  password: string
}

export interface RegisterRequest {
  nickname: string
  password: string
}

export interface MesoBalanceRequest {
  inventoryMeso: number
  storageMeso: number
}

// ====== 가계부 타입 ======
export type EntryType = 'INCOME' | 'EXPENSE'
export type EntryCategory =
  | 'BOSS'
  | 'HUNTING'
  | 'TRADE'
  | 'CUBE'
  | 'STARFORCE'
  | 'OTHER_INCOME'
  | 'OTHER_EXPENSE'

export interface LedgerEntry {
  id: number
  type: EntryType
  category: EntryCategory
  amount: number
  description: string
  entryDate: string
  characterId: number | null
  characterName: string | null
}

export interface LedgerEntryRequest {
  type: EntryType
  category: EntryCategory
  amount: number
  description: string
  entryDate: string
  characterId?: number | null
}

export interface WeeklyLedger {
  weekStart: string
  weekEnd: string
  totalIncome: number
  totalExpense: number
  netAmount: number
  entries: LedgerEntry[]
  overspendingWarning: OverspendingWarning | null
}

export interface OverspendingWarning {
  triggered: boolean
  message: string
  delayedWeeks: number
  affectedGoalName: string | null
}

export interface WeeklySummary {
  weekStart: string
  totalIncome: number
  totalExpense: number
}

// ====== 보스 타입 ======
export type ResetType = 'daily' | 'weekly' | 'monthly'

export interface BossMaster {
  id: number
  name: string
  difficulty: string
  crystalPrice: number
  resetType: ResetType
}

export interface BossKill {
  id: number
  bossName: string
  difficulty: string
  crystalPrice: number
  killDate: string
  characterId: number | null
  characterName: string | null
}

export interface BossKillRequest {
  bossName: string
  difficulty: string
  killDate: string
  characterId?: number | null
}

export interface BossStats {
  bossName: string
  difficulty: string
  killCount: number
  totalRevenue: number
}

// ====== 사냥 타입 ======
export interface HuntingSession {
  id: number
  mapName: string
  durationMinutes: number
  income: number
  solErdaFragments: number
  solErdaValue: number
  totalIncome: number
  sessionDate: string
  characterId: number | null
  characterName: string | null
}

export interface HuntingSessionRequest {
  mapName: string
  durationMinutes: number
  income: number
  solErdaFragments?: number
  sessionDate: string
  characterId?: number | null
}

export interface HuntingStats {
  mapName: string
  sessionCount: number
  totalDurationMinutes: number
  totalIncome: number
  incomePerHour: number
}

// ====== 목표 아이템 타입 ======
export interface Goal {
  id: number
  itemName: string
  targetAmount: number
  achieved: boolean
  createdAt: string
  achievedAt: string | null
}

export interface GoalRequest {
  itemName: string
  targetAmount: number
}

export interface GoalEstimate {
  goalId: number
  itemName: string
  targetAmount: number
  currentSavings: number
  remainingAmount: number
  avgWeeklyIncome: number
  estimatedWeeks: number
  estimatedDate: string
}

// ====== 캐릭터 타입 ======
export interface MapleCharacter {
  id: number
  name: string
  jobClass: string
  level: number
  isMain: boolean
  initialInvestment: number
}

export interface CharacterRequest {
  name: string
  jobClass?: string
  level?: number
  isMain?: boolean
  initialInvestment?: number
}

export interface CharacterROI {
  characterId: number
  characterName: string
  initialInvestment: number
  totalBossRevenue: number
  weeklyBossRevenue: number
  weeksUntilBreakEven: number
  alreadyProfitable: boolean
}

// ====== 통계 타입 ======
export interface StatsComparison {
  myWeeklyAvg: number
  allUsersWeeklyAvg: number
  percentile: number
  message: string
}

export interface ExpCalculatorRequest {
  currentLevel: number
  currentExpPercent: number
  avgExpPerHour: number
  targetLevel?: number
}

export interface ExpCalculatorResponse {
  currentLevel: number
  targetLevel: number
  requiredExp: number
  estimatedHours: number
  estimatedMinutes: number
}
