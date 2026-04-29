export function formatMeso(amount: number): string {
  if (amount === 0) return '0'
  const isNeg = amount < 0
  const abs = Math.abs(amount)

  let result: string
  if (abs >= 100_000_000) {
    const eok = Math.floor(abs / 100_000_000)
    const rem = Math.floor((abs % 100_000_000) / 10_000)
    result = rem > 0 ? `${eok}억 ${rem.toLocaleString()}만` : `${eok}억`
  } else if (abs >= 10_000_000) {
    const man = Math.floor(abs / 10_000)
    result = `${man.toLocaleString()}만`
  } else if (abs >= 10_000) {
    const man = Math.floor(abs / 10_000)
    result = `${man}만`
  } else {
    result = abs.toLocaleString()
  }

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

export const CATEGORY_LABELS: Record<string, string> = {
  boss: '보스',
  hunting: '사냥',
  trade: '거래',
  auction: '경매장',
  sol_erda: '솔에르다',
  cube: '큐브',
  starforce: '스타포스',
  spell_trace: '주문서',
  other: '기타',
}

export const CATEGORY_ICONS: Record<string, string> = {
  boss: '⚔️',
  hunting: '👾',
  trade: '🤝',
  auction: '🏪',
  sol_erda: '🔮',
  cube: '🎲',
  starforce: '⭐',
  spell_trace: '📜',
  other: '💫',
}
