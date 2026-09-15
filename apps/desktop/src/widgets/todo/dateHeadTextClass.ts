import { isKoreanPublicHoliday } from "@renderer/utils/koreanHolidays";

/** 날짜 헤드 텍스트 색상 — 일요일·공휴일, 토요일 */
export function dateHeadTextClass(year: number, month: number, day: number) {
  const weekday = new Date(year, month - 1, day).getDay();
  if (weekday === 0 || isKoreanPublicHoliday(year, month, day))
    return "text-danger";
  if (weekday === 6) return "text-saturday";
  return undefined;
}
