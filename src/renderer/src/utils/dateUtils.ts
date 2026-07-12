/**
 * 날짜 유틸리티
 * - Renderer 전역에서 사용하는 날짜 포맷·월 계산 함수 모음
 */

/** 오늘 날짜를 "YYYY-MM-DD" 형식으로 반환한다. */
export function getTodayString(): string {
  return formatDate(new Date())
}

/** Date 객체를 "YYYY-MM-DD" 문자열로 변환한다. */
export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** "YYYY-MM-DD"에서 "YYYY-MM" 월 키를 추출한다. */
export function toYearMonth(dateString: string): string {
  return dateString.slice(0, 7)
}

export { countDaysInRange, enumerateDateRange, getMonthDateRange } from '@shared/utils/dateRange'

/** 날짜 문자열을 화면용 짧은 라벨로 변환한다 (예: "5/24"). */
export function toShortLabel(dateString: string): string {
  const [, month, day] = dateString.split('-')
  return `${Number(month)}/${Number(day)}`
}

/** 이전/다음 월 "YYYY-MM" 문자열을 반환한다. */
export function shiftMonth(yearMonth: string, delta: number): string {
  const [yearStr, monthStr] = yearMonth.split('-')
  const date = new Date(Number(yearStr), Number(monthStr) - 1 + delta, 1)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** 이전/다음 일 "YYYY-MM-DD" 문자열을 반환한다. */
export function shiftDate(dateString: string, delta: number): string {
  const [yearStr, monthStr, dayStr] = dateString.split('-')
  const date = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr) + delta)
  return formatDate(date)
}

/** 오늘 날짜인지 확인한다. */
export function isToday(dateString: string): boolean {
  return dateString === getTodayString()
}

/** 화면용 전체 날짜 라벨 (예: "2026년 5월 23일 (토)") */
export function toFullLabel(dateString: string): string {
  const [yearStr, monthStr, dayStr] = dateString.split('-')
  const date = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr))
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  return `${yearStr}년 ${Number(monthStr)}월 ${Number(dayStr)}일 (${weekdays[date.getDay()]})`
}
