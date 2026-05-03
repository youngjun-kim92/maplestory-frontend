// ====== 인증 타입 ======
export interface AuthResponse {
  token: string
  user?: UserResponse
}

export interface UserResponse {
  id: number
  nickname: string
  solErdaFragmentPrice: number
  inventoryMeso: number
  storageMeso: number
  totalMeso: number
  createdAt: string
  mvpGrade?: MvpGrade
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
// 백엔드 API는 소문자 값 사용 (income/expense, boss/hunting/...)
export type EntryType = 'income' | 'expense'
export type EntryCategory =
  | 'boss'
  | 'hunting'
  | 'trade'
  | 'auction'
  | 'sol_erda'
  | 'cube'
  | 'starforce'
  | 'spell_trace'
  | 'additional_option'
  | 'doping'
  | 'other'

export interface LedgerEntry {
  id: number
  type: EntryType
  category: EntryCategory
  amount: number
  description: string
  entryDate: string
  characterId: number | null
  characterName: string | null
  solErdaFragments?: number | null
}

export interface LedgerEntryRequest {
  type: EntryType
  category: EntryCategory
  amount: number
  description: string
  entryDate: string
  characterId?: number | null
  solErdaFragments?: number | null
}

// GET /api/ledger 실제 응답 구조
export interface WeeklyLedgerSummary {
  totalIncome: number
  totalExpense: number
  netProfit: number
}

export interface WeeklyLedger {
  weekStart: string
  entries: LedgerEntry[]
  summary: WeeklyLedgerSummary
}

// POST /api/ledger 실제 응답 구조
export interface GoalWarning {
  goalId: number
  itemName: string
  delayWeeks: number
  message: string
}

export interface LedgerAddResponse {
  entry: LedgerEntry
  goalWarnings: GoalWarning[]
}

export interface WeeklySummary {
  weekStart: string
  totalIncome: number
  totalExpense: number
  totalSolErdaFragments?: number
  entryCount?: number
}

export interface IncomeTrend {
  weekStart: string
  bossIncome: number
  huntingIncome: number
  auctionIncome: number
  totalIncome: number
}

export interface LedgerStat {
  category: string
  type: string
  total: number
  count: number
  average: number
}

// ====== 보스 드랍 타입 ======
export type ItemCategory = 'dark_accessory' | 'radiant_accessory' | 'dawn_accessory' | 'other'
export type DropStatus = 'holding' | 'listed' | 'sold'

export interface BossDropItem {
  id: number
  bossName: string
  difficulty: string
  itemName: string
  itemCategory: ItemCategory
}

export interface BossDrop {
  id: number
  bossKillId: number
  bossName: string
  difficulty: string
  itemName: string
  itemCategory: ItemCategory
  status: DropStatus
  saleAmount: number | null
  saleDate: string | null
  weekStart: string
  characterId: number | null
  characterName: string | null
  createdAt: string
}

export interface BossDropSellRequest {
  saleAmount: number
  saleDate: string
  isPcCafe?: boolean
}

// ====== 보스 타입 ======
export type ResetType = 'daily' | 'weekly' | 'monthly'

export interface BossMaster {
  id: number
  bossName: string
  difficulty: string
  crystalPrice: number
  maxAttemptsPerWeek: number
  resetType: ResetType
  maxPartySize: number
}

export interface BossKill {
  id: number
  bossName: string
  difficulty: string
  crystalPrice: number
  killDate: string
  partySize: number | null
  characterId: number | null
  characterName: string | null
  createdAt: string
  expenses?: Array<{ category: string; amount: number; description: string }>
}

export interface BossKillRequest {
  bossName: string
  difficulty: string
  killDate: string
  partySize?: number
  characterId?: number | null
}

export interface BossStats {
  bossName: string
  difficulty: string
  killCount: number
  totalRevenue: number
}

// ====== 도핑 타입 ======
export interface DopingItem {
  id: number
  name: string
  amount: number
  effect: string
}

// ====== 사냥 타입 ======
export interface HuntingSession {
  id: number
  mapName?: string
  durationMinutes?: number
  income: number
  solErdaFragments: number
  solErdaValue: number
  totalIncome: number
  sessionDate: string
  characterId: number | null
  characterName: string | null
}

export interface HuntingSessionRequest {
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
  remaining: number
  progressPercent: number
  avgWeeklyNet: number
  weeksRemaining: number
  estimatedDate: string
}

// ====== 캐릭터 타입 ======
export type MvpGrade = 'NORMAL' | 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'RED' | 'BLACK'

export const MVP_GRADE_LABELS: Record<MvpGrade, string> = {
  NORMAL:  '일반',
  BRONZE:  '브론즈',
  SILVER:  '실버',
  GOLD:    '골드',
  DIAMOND: '다이아',
  RED:     '레드',
  BLACK:   '블랙',
}

export interface MapleCharacter {
  id: number
  name: string
  jobClass: string
  level: number
  isMain: boolean
  initialInvestment: number
  solErdaFragments: number
}

export interface CharacterRequest {
  name: string
  jobClass?: string
  level?: number
  isMain?: boolean
  initialInvestment?: number
  solErdaFragments?: number
}

export interface CharacterROI {
  characterId: number
  name: string
  initialInvestment: number
  cumulativeIncome: number
  weeklyAvgIncome: number
  weeksToBreakEven: number
  isBreakEvenReached: boolean
  remainingToBreakEven: number
}

// ====== 통계 타입 ======
export interface StatsComparison {
  myAvgWeeklyIncome: number
  globalAvgWeeklyIncome: number
  totalUserCount: number
  percentile: number
  message: string
}

export interface CharacterStatsResponse {
  characterId: number
  characterName: string
  jobClass: string | null
  isMain: boolean
  totalIncome: number
  totalExpense: number
  netProfit: number
  entryCount: number
}
