export function formatMeso(amount: number): string {
  if (amount === 0) return '0'
  const isNeg = amount < 0
  const result = Math.abs(amount).toLocaleString()
  return isNeg ? `-${result}` : result
}

export function formatMesoFull(amount: number): string {
  return amount.toLocaleString() + ' 메소'
}

export function toDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function withCurrentTime(dateStr: string): string {
  if (dateStr.includes('T')) return dateStr
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${dateStr}T${h}:${min}`
}

export function toDateTimeString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${h}:${min}`
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']

export function formatDateKo(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}(${DAY_KO[d.getDay()]})`
}

export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const s = new Date(weekStart + 'T00:00:00')
  const e = new Date(weekEnd + 'T00:00:00')
  return `${s.getMonth() + 1}/${s.getDate()}(${DAY_KO[s.getDay()]}) ~ ${e.getMonth() + 1}/${e.getDate()}(${DAY_KO[e.getDay()]})`
}

/** 해당 날짜가 속하는 주의 목요일(주간 시작일)을 반환 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = (day + 3) % 7  // 목요일(4)까지의 거리
  d.setDate(d.getDate() - diff)
  return d
}

export function toKoreanAmount(n: string | number): string {
  const num = Number(n)
  if (!num || isNaN(num) || num === 0) return ''
  const uk = Math.floor(num / 100000000)
  const man = Math.floor((num % 100000000) / 10000)
  const rest = num % 10000
  const parts: string[] = []
  if (uk > 0) parts.push(uk + '억')
  if (man > 0) parts.push(man + '만')
  if (rest > 0) {
    const pad = uk > 0 || man > 0
    parts.push(pad ? String(rest).padStart(4, '0') : String(rest))
  }
  return parts.join(' ') + '메소'
}

export const CATEGORY_LABELS: Record<string, string> = {
  boss: '보스',
  hunting: '사냥',
  trade: '거래',
  auction: '경매장',
  sol_erda: '솔에르다',
  cube: '큐브',
  starforce: '스타포스',
  spell_trace: '주문서',
  additional_option: '추가옵션',
  doping: '도핑',
  other: '기타',
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy:    '이지',
  normal:  '노말',
  hard:    '하드',
  chaos:   '카오스',
  extreme: '익스트림',
}

export function difficultyLabel(difficulty: string): string {
  return DIFFICULTY_LABELS[difficulty.toLowerCase()] ?? difficulty
}

const DIFFICULTY_ORDER = ['easy', 'normal', 'hard', 'chaos', 'extreme']

export function sortDifficulties(difficulties: string[]): string[] {
  return [...difficulties].sort((a, b) => {
    const ai = DIFFICULTY_ORDER.indexOf(a.toLowerCase())
    const bi = DIFFICULTY_ORDER.indexOf(b.toLowerCase())
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
}

export const CATEGORY_ICON_IMGS: Record<string, string> = {}

export const CATEGORY_ICONS: Record<string, string> = {
  boss: '⚔️',
  hunting: '👾',
  trade: '🤝',
  auction: '🏪',
  sol_erda: '🔮',
  cube: '🎲',
  starforce: '⭐',
  spell_trace: '📜',
  additional_option: '🪄',
  doping: '💊',
  other: '💫',
}
