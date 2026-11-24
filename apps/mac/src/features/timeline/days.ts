export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type MonthMark = {
  year: number;
  month: number;
};

export type DayColumn = {
  date: string;
  year: number;
  month: number;
  day: number;
  weekday: number;
};

export function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseIso(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function todayIso(now = new Date()) {
  return isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function dayLabel(value: string) {
  const parsed = parseIso(value);
  if (!parsed) return value;
  const weekday = new Date(parsed.year, parsed.month - 1, parsed.day).getDay();
  return `${parsed.year}년 ${parsed.month}월 ${parsed.day}일 ${WEEKDAYS[weekday]}요일`;
}

export function orderedSpan(start: string, end: string) {
  return start <= end ? { start, end } : { start: end, end: start };
}

export function datesFrom(start: string, end: string) {
  const span = orderedSpan(start, end);
  const dates: string[] = [];
  let cursor: string | null = span.start;
  while (cursor) {
    dates.push(cursor);
    if (cursor === span.end || dates.length > 366) break;
    cursor = nextDate(cursor);
  }
  return dates;
}

export function spanLabel(start: string, end: string) {
  const from = parseIso(start);
  const to = parseIso(end);
  const count = datesFrom(start, end).length;
  if (!from || !to) return `${start}–${end}`;
  const left =
    from.year === to.year
      ? `${from.month}월 ${from.day}일`
      : `${from.year}년 ${from.month}월 ${from.day}일`;
  const right =
    from.year === to.year && from.month === to.month
      ? `${to.day}일`
      : from.year === to.year
        ? `${to.month}월 ${to.day}일`
        : `${to.year}년 ${to.month}월 ${to.day}일`;
  return `${left}–${right} · ${count}일`;
}

export function nextDate(value: string) {
  const parsed = parseIso(value);
  if (!parsed) return null;
  const date = new Date(parsed.year, parsed.month - 1, parsed.day + 1);
  return isoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function shiftMonth(year: number, month: number, delta: number): MonthMark {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function monthsAround(now = new Date(), radius = 1): MonthMark[] {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const months: MonthMark[] = [];
  for (let delta = -radius; delta <= radius; delta += 1) {
    months.push(shiftMonth(year, month, delta));
  }
  return months;
}

export function daysOfMonth(year: number, month: number): DayColumn[] {
  const count = daysInMonth(year, month);
  return Array.from({ length: count }, (_, index) => {
    const day = index + 1;
    return {
      date: isoDate(year, month, day),
      year,
      month,
      day,
      weekday: new Date(year, month - 1, day).getDay(),
    };
  });
}

export function daysInMonths(months: MonthMark[]) {
  return months.flatMap((month) => daysOfMonth(month.year, month.month));
}
