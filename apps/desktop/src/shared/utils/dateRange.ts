/**
 * 날짜 범위 유틸 (Main·Renderer 공통)
 */

/** Date → "YYYY-MM-DD" */
function formatDateParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" 하루 더하기 */
function addDays(dateString: string, delta: number): string {
  const [yearStr, monthStr, dayStr] = dateString.split("-");
  const date = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr) + delta);
  return formatDateParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * 시작일~종료일(포함) 사이 모든 날짜 배열을 반환한다.
 */
export function enumerateDateRange(startDate: string, endDate: string): string[] {
  if (startDate > endDate) {
    throw new Error("시작일은 종료일보다 늦을 수 없습니다.");
  }

  const dates: string[] = [];
  let current = startDate;

  while (current <= endDate) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

/** 두 날짜 사이(포함) 일수 */
export function countDaysInRange(startDate: string, endDate: string): number {
  if (startDate > endDate) return 0;
  return enumerateDateRange(startDate, endDate).length;
}

/** 날짜 문자열 형식 검증 (YYYY-MM-DD) */
export function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** "YYYY-MM" 월의 1일~말일 범위를 반환한다. */
export function getMonthDateRange(yearMonth: string): { start: string; end: string } {
  const [yearStr, monthStr] = yearMonth.split("-");
  const lastDay = new Date(Number(yearStr), Number(monthStr), 0).getDate();
  return {
    start: `${yearMonth}-01`,
    end: `${yearMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}
