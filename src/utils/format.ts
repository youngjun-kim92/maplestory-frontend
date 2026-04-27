/**
 * 메소 단위로 숫자를 포맷합니다.
 * 예: 1234567890 → "12.3억"
 */
export function formatMeso(amount: number): string {
  if (amount >= 1_0000_0000) {
    return `${(amount / 1_0000_0000).toFixed(1)}억`
  }
  if (amount >= 1_0000) {
    return `${(amount / 1_0000).toFixed(0)}만`
  }
  return amount.toLocaleString()
}

/**
 * 메소를 상세하게 포맷합니다.
 * 예: 1234567890 → "1,234,567,890"
 */
export function formatMesoFull(amount: number): string {
  return amount.toLocaleString() + ' 메소'
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 반환합니다.
 */
export function toDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]
}

/**
 * 날짜를 한국어 형식으로 포맷합니다.
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

/**
 * 주 범위를 한국어로 포맷합니다.
 */
export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart)
  const end = new Date(weekEnd)
  return `${start.getMonth() + 1}/${start.getDate()} ~ ${end.getMonth() + 1}/${end.getDate()}`
}

/**
 * 수익/지출 카테고리를 한국어로 변환합니다.
 */
export const CATEGORY_LABELS: Record<string, string> = {
  BOSS: '보스',
  HUNTING: '사냥',
  TRADE: '거래',
  CUBE: '큐브',
  STARFORCE: '스타포스',
  OTHER_INCOME: '기타수입',
  OTHER_EXPENSE: '기타지출',
}
